import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST - Fetch Google Maps reviews for a business
 * This endpoint uses Google Places API to fetch place details and reviews
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { mapUrl, placeId } = body;

    if (!mapUrl && !placeId) {
      return NextResponse.json(
        { error: 'mapUrl or placeId is required' },
        { status: 400 }
      );
    }

    // Check for Google Maps API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('❌ Missing GOOGLE_MAPS_API_KEY');
      return NextResponse.json(
        {
          error: 'Google Maps API not configured',
          details: 'Please add GOOGLE_MAPS_API_KEY to your environment variables.',
        },
        { status: 500 }
      );
    }

    // Extract place ID from URL if not provided
    let extractedPlaceId = placeId;
    let coordinates = null;
    let resolvedUrl = mapUrl;
    
    if (!extractedPlaceId && mapUrl) {
      // Check if this is a shortened/share URL and resolve it first
      if (isShareUrl(mapUrl)) {
        console.log('🔗 Detected share URL, resolving...');
        resolvedUrl = await resolveShareUrl(mapUrl);
        console.log('✅ Resolved to:', resolvedUrl);
      }
      
      extractedPlaceId = extractPlaceIdFromUrl(resolvedUrl);
      
      // Always try to extract coordinates (needed for hex/fid format conversion)
      coordinates = extractCoordinatesFromUrl(resolvedUrl);
    }

    if (!extractedPlaceId && !coordinates) {
      return NextResponse.json(
        {
          error: 'Could not extract place ID or coordinates from URL',
          details: 'Please provide a valid Google Maps business URL. Make sure to click on the business name to get the full URL.',
        },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching place details for:', extractedPlaceId || `coordinates: ${coordinates?.lat}, ${coordinates?.lng}`);

    let data;
    
    // Handle CID format (needs special handling)
    if (extractedPlaceId && extractedPlaceId.startsWith('cid:')) {
      console.log('🔑 Detected CID format, converting...');
      const cid = extractedPlaceId.replace('cid:', '');
      
      // Try to use the CID directly in a search
      const cidUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=cid:${cid}&inputtype=textquery&fields=place_id&key=${apiKey}`;
      
      const cidResponse = await fetch(cidUrl);
      const cidData = await cidResponse.json();
      
      if (cidData.status === 'OK' && cidData.candidates && cidData.candidates.length > 0) {
        extractedPlaceId = cidData.candidates[0].place_id;
        console.log('✅ Converted CID to Place ID:', extractedPlaceId);
      } else {
        return NextResponse.json(
          {
            error: 'Could not convert CID to Place ID',
            details: 'Please try using the share button in Google Maps to get a better URL format.',
          },
          { status: 400 }
        );
      }
    }
    
    // Handle hex/fid format (Feature ID) - needs conversion to Place ID
    if (extractedPlaceId && extractedPlaceId.match(/^0x[0-9a-f]+:0x[0-9a-f]+$/)) {
      console.log('🔑 Detected hex/fid format, converting...');
      
      // Extract business name from URL for accurate matching
      const businessName = extractBusinessNameFromUrl(resolvedUrl);
      
      if (businessName && coordinates) {
        console.log('🏢 Business name:', businessName);
        console.log('📍 Coordinates:', coordinates.lat, coordinates.lng);
        console.log('🔍 Using Text Search for accurate business matching...');
        
        // Use Text Search with business name and location bias for accurate matching
        const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(businessName)}&location=${coordinates.lat},${coordinates.lng}&radius=100&key=${apiKey}`;
        
        const textSearchResponse = await fetch(textSearchUrl);
        const textSearchData = await textSearchResponse.json();
        
        if (textSearchData.status === 'OK' && textSearchData.results && textSearchData.results.length > 0) {
          // Get the first result (most relevant based on name and location)
          extractedPlaceId = textSearchData.results[0].place_id;
          console.log('✅ Found exact business:', textSearchData.results[0].name);
          console.log('✅ Converted hex/fid to Place ID:', extractedPlaceId);
        } else {
          console.error('❌ Text Search failed:', textSearchData);
          return NextResponse.json(
            {
              error: 'Could not find the business',
              details: `Unable to locate "${businessName}". Please try again or use a different URL format.`,
            },
            { status: 400 }
          );
        }
      } else if (coordinates) {
        console.log('⚠️ No business name found, using coordinates only...');
        console.log('📍 Using Nearby Search to find place...');
        
        // Fallback: Use Nearby Search if no business name is available
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=50&key=${apiKey}`;
        
        const nearbyResponse = await fetch(nearbyUrl);
        const nearbyData = await nearbyResponse.json();
        
        if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
          extractedPlaceId = nearbyData.results[0].place_id;
          console.log('✅ Converted hex/fid to Place ID:', extractedPlaceId);
        } else {
          console.error('❌ Could not convert hex/fid:', nearbyData);
          return NextResponse.json(
            {
              error: 'Could not convert Feature ID to Place ID',
              details: 'The URL format is not directly supported. Please use the share button in Google Maps.',
            },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          {
            error: 'Cannot convert Feature ID without coordinates',
            details: 'Please use the share button in Google Maps to get a better URL format.',
          },
          { status: 400 }
        );
      }
    }
    
    // If we have coordinates but no place ID, find the place using Nearby Search first
    if (!extractedPlaceId && coordinates) {
      console.log('📍 Using coordinates to find place...');
      
      // Use Nearby Search to find the place at these coordinates
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=50&key=${apiKey}`;
      
      const nearbyResponse = await fetch(nearbyUrl);
      const nearbyData = await nearbyResponse.json();
      
      if (nearbyData.status !== 'OK' || !nearbyData.results || nearbyData.results.length === 0) {
        console.error('❌ Nearby Search error:', nearbyData);
        return NextResponse.json(
          {
            error: 'Could not find business at these coordinates',
            details: 'Please use a URL with a business name or place ID. Click on the business in Google Maps to get the correct URL.',
          },
          { status: 400 }
        );
      }
      
      // Get the first (closest) result
      extractedPlaceId = nearbyData.results[0].place_id;
      console.log('✅ Found place ID from coordinates:', extractedPlaceId);
    }

    // Fetch place details from Google Places API
    // Note: Google Places API returns a maximum of 5 reviews per place (API limitation)
    const placesUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${extractedPlaceId}&fields=name,formatted_address,rating,user_ratings_total,reviews,place_id,url,photos&key=${apiKey}`;

    const response = await fetch(placesUrl);
    data = await response.json();

    if (data.status !== 'OK') {
      console.error('❌ Google Places API error:', data);
      return NextResponse.json(
        {
          error: 'Failed to fetch place details',
          details: data.error_message || data.status,
        },
        { status: 400 }
      );
    }

    const placeDetails = data.result;

    // Log the fetched data
    console.log('✅ Successfully fetched place details:', {
      name: placeDetails.name,
      reviewCount: placeDetails.reviews?.length || 0,
      totalReviewsOnGoogleMaps: placeDetails.user_ratings_total || 0,
    });
    console.log('ℹ️  Note: Google Places API returns max 5 reviews (the most helpful ones)');

    // Sanitize reviews to remove profile photos (to avoid 429 rate limiting)
    const sanitizedReviews = (placeDetails.reviews || []).map((review: any) => {
      const { profile_photo_url, ...reviewWithoutPhoto } = review;
      return reviewWithoutPhoto;
    });
    
    console.log(`🧹 Sanitized ${sanitizedReviews.length} reviews (removed profile photos to avoid rate limiting)`);

    // Store the fetched data in the database for future reference
    // Check if business already exists for this user
    let businessExists = false;
    let existingBusinessId = null;
    
    try {
      const { data: existingBusiness } = await supabase
        .from('google_maps_reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('place_id', extractedPlaceId)
        .single();
      
      if (existingBusiness) {
        businessExists = true;
        existingBusinessId = existingBusiness.id;
        console.log('ℹ️ Business already exists in profile, updating...');
      }
    } catch (checkError) {
      // Business doesn't exist, which is fine
      console.log('ℹ️ New business, will insert');
    }
    
    try {
      if (businessExists && existingBusinessId) {
        // Update existing business
        const { error: dbError } = await supabase
          .from('google_maps_reviews')
          .update({
            place_name: placeDetails.name,
            place_address: placeDetails.formatted_address,
            place_rating: placeDetails.rating,
            place_reviews_total: placeDetails.user_ratings_total,
            reviews_data: sanitizedReviews,
            fetched_at: new Date().toISOString(),
          })
          .eq('id', existingBusinessId);

        if (dbError) {
          console.warn('⚠️ Could not update business in database:', dbError.message);
        }
      } else {
        // Insert new business
        const { error: dbError } = await supabase.from('google_maps_reviews').insert({
          user_id: user.id,
          place_id: extractedPlaceId,
          place_name: placeDetails.name,
          place_address: placeDetails.formatted_address,
          place_rating: placeDetails.rating,
          place_reviews_total: placeDetails.user_ratings_total,
          reviews_data: sanitizedReviews,
          fetched_at: new Date().toISOString(),
        });

        if (dbError) {
          console.warn('⚠️ Could not store reviews in database:', dbError.message);
          // Don't fail the request if storage fails
        }
      }
    } catch (storageError) {
      console.warn('⚠️ Database storage error:', storageError);
      // Continue even if storage fails
    }

    return NextResponse.json({
      success: true,
      businessExists,
      placeDetails: {
        name: placeDetails.name,
        formatted_address: placeDetails.formatted_address,
        rating: placeDetails.rating || 0,
        user_ratings_total: placeDetails.user_ratings_total || 0,
        reviews: sanitizedReviews,
        place_id: placeDetails.place_id,
        url: placeDetails.url,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching Google Maps reviews:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch reviews',
        details: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * Check if URL is a Google Maps share/shortened URL
 */
function isShareUrl(url: string): boolean {
  const sharePatterns = [
    /maps\.app\.goo\.gl/,           // New mobile share format
    /goo\.gl\/maps/,                // Classic shortened format
    /g\.co\/maps/,                  // Google short link
    /maps\.google\.com\/\?cid=/,    // CID format (sometimes from share)
    /maps\.google\.com\/\?q=/,      // Query parameter format
  ];
  
  return sharePatterns.some(pattern => pattern.test(url));
}

/**
 * Resolve shortened/share URLs to full Google Maps URLs
 */
async function resolveShareUrl(url: string): Promise<string> {
  try {
    // Follow redirects to get the final URL
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });
    
    // The final URL after redirects
    const finalUrl = response.url;
    
    if (finalUrl && finalUrl !== url) {
      console.log('🔄 URL resolved from:', url);
      console.log('🔄 URL resolved to:', finalUrl);
      return finalUrl;
    }
    
    // If HEAD request didn't work, try GET
    const getResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });
    
    return getResponse.url || url;
  } catch (error) {
    console.error('⚠️ Error resolving share URL:', error);
    // Return original URL if resolution fails
    return url;
  }
}

/**
 * Extract place ID from various Google Maps URL formats
 */
function extractPlaceIdFromUrl(url: string): string | null {
  try {
    // Pattern 1: place_id parameter
    const placeIdMatch = url.match(/place_id=([^&]+)/);
    if (placeIdMatch) {
      return placeIdMatch[1];
    }

    // Pattern 2: /place/ path with place ID (ChIJ format)
    const placePathMatch = url.match(/\/place\/[^\/]+\/([^\/\?]+)/);
    if (placePathMatch && placePathMatch[1].startsWith('ChIJ')) {
      return placePathMatch[1];
    }

    // Pattern 3: !1s format with ChIJ (shortened URLs)
    const shortMatch = url.match(/!1s(ChIJ[^!]+)/);
    if (shortMatch) {
      return shortMatch[1];
    }

    // Pattern 4: ftid parameter (sometimes used in share URLs)
    const ftidMatch = url.match(/ftid=([^&]+)/);
    if (ftidMatch && ftidMatch[1].startsWith('0x')) {
      return ftidMatch[1];
    }

    // Pattern 5: CID (Customer ID) - extract and use in nearby search
    const cidMatch = url.match(/[?&]cid=(\d+)/);
    if (cidMatch) {
      // CID needs to be converted or used with nearby search
      // For now, return it and we'll handle it separately
      return `cid:${cidMatch[1]}`;
    }

    // Pattern 6: Hex format in !1s
    const hexMatch = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/);
    if (hexMatch) {
      return hexMatch[1];
    }

    // Pattern 7: data parameter
    const dataMatch = url.match(/data=([^!&]+)/);
    if (dataMatch) {
      const decoded = decodeURIComponent(dataMatch[1]);
      const idMatch = decoded.match(/(ChIJ[^!&\s]+)/);
      if (idMatch) {
        return idMatch[1];
      }
      const hexId = decoded.match(/(0x[0-9a-f]+:0x[0-9a-f]+)/);
      if (hexId) {
        return hexId[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting place ID:', error);
    return null;
  }
}

/**
 * Extract coordinates from Google Maps URLs
 */
function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Pattern 1: @lat,lng format (most common)
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }

    // Pattern 2: ll= parameter
    const llMatch = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch) {
      return {
        lat: parseFloat(llMatch[1]),
        lng: parseFloat(llMatch[2])
      };
    }

    // Pattern 3: center parameter
    const centerMatch = url.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (centerMatch) {
      return {
        lat: parseFloat(centerMatch[1]),
        lng: parseFloat(centerMatch[2])
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

/**
 * Extract business name from Google Maps URL
 * This is used to accurately identify the business when converting hex/fid format
 */
function extractBusinessNameFromUrl(url: string): string | null {
  try {
    // Pattern 1: /place/Business+Name/...
    const placeMatch = url.match(/\/place\/([^\/]+)/);
    if (placeMatch) {
      // Decode URL encoding and replace + with spaces
      let encodedName = placeMatch[1];
      
      // Handle both + and %20 for spaces
      let decodedName = decodeURIComponent(encodedName.replace(/\+/g, ' '));
      
      // Clean up the name (remove @ and coordinates if present)
      decodedName = decodedName.split('@')[0].trim();
      
      return decodedName;
    }

    // Pattern 2: search?query=Business+Name
    const queryMatch = url.match(/[?&]query=([^&]+)/);
    if (queryMatch) {
      const decodedName = decodeURIComponent(queryMatch[1].replace(/\+/g, ' '));
      return decodedName;
    }

    // Pattern 3: q= parameter
    const qMatch = url.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const decodedName = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      return decodedName;
    }

    return null;
  } catch (error) {
    console.error('Error extracting business name:', error);
    return null;
  }
}

/**
 * GET - Fetch previously stored Google Maps reviews
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('place_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query
    let query = supabase
      .from('google_maps_reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('fetched_at', { ascending: false })
      .limit(limit);

    if (placeId) {
      query = query.eq('place_id', placeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching stored reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stored reviews' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reviews: data || [],
    });
  } catch (error: any) {
    console.error('❌ Error in GET handler:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch reviews',
      },
      { status: 500 }
    );
  }
}

