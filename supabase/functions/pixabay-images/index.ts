/**
 * Supabase Edge Function: Pixabay Images
 * 
 * Fetches images from Pixabay API based on a prompt or keywords.
 * Uses Edge runtime for fast global response times (~50-100ms).
 * 
 * Deploy: supabase functions deploy pixabay-images
 * Set secret: supabase secrets set PIXABAY_API_KEY=your_key_here
 */

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface PixabayImage {
  id: number;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  user: string;
  pageURL: string;
  likes: number;
  downloads: number;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

// Clean prompt for Pixabay search - just remove punctuation, keep the words
function cleanPromptForSearch(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, '') // Remove punctuation only
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim()
    .slice(0, 100);              // Pixabay handles up to 100 chars well
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, keywords } = await req.json();

    // Use prompt if provided, otherwise fall back to keywords
    if (!prompt && (!keywords || !Array.isArray(keywords) || keywords.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Either prompt or keywords array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PIXABAY_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Pixabay API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use prompt directly (just clean it), or use keywords as fallback
    let searchQuery: string;
    if (prompt) {
      searchQuery = cleanPromptForSearch(prompt);
    } else {
      searchQuery = keywords.slice(0, 3).join(' ').toLowerCase();
    }
    
    // Format for Pixabay API (replace spaces with +)
    const queryKeywords = searchQuery.replace(/\s+/g, '+');

    // Build Pixabay API URL
    const pixabayUrl = new URL('https://pixabay.com/api/');
    pixabayUrl.searchParams.set('key', apiKey);
    pixabayUrl.searchParams.set('q', queryKeywords);
    pixabayUrl.searchParams.set('image_type', 'photo');
    pixabayUrl.searchParams.set('per_page', '5');
    pixabayUrl.searchParams.set('safesearch', 'true');
    pixabayUrl.searchParams.set('orientation', 'horizontal');
    pixabayUrl.searchParams.set('min_width', '800');
    pixabayUrl.searchParams.set('editors_choice', 'false');

    console.log(`Searching Pixabay for: "${searchQuery}" (from prompt: "${prompt?.slice(0, 50)}...")`);

    // Fetch from Pixabay
    const pixabayResponse = await fetch(pixabayUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!pixabayResponse.ok) {
      const errorText = await pixabayResponse.text();
      console.error('Pixabay API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch images from Pixabay' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: PixabayResponse = await pixabayResponse.json();

    // Format response with only needed fields
    const images = data.hits.map((hit) => ({
      id: hit.id,
      previewURL: hit.previewURL,
      webformatURL: hit.webformatURL,
      largeImageURL: hit.largeImageURL,
      tags: hit.tags,
      user: hit.user,
      pageURL: hit.pageURL,
      likes: hit.likes,
      downloads: hit.downloads,
    }));

    console.log(`Found ${images.length} images for query: "${searchQuery}"`);

    return new Response(
      JSON.stringify({
        success: true,
        query: searchQuery,
        total: data.totalHits,
        images,
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        } 
      }
    );
  } catch (error) {
    console.error('Pixabay images error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

