/**
 * API Route for AI-Powered Competitive Intelligence Suggestions
 * Generates competitors and keywords using OpenAI via Edge Function
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandName, websiteUrl, industry, language } = body;

    // Validate input
    if (!brandName || !websiteUrl || !industry) {
      return NextResponse.json(
        { error: 'Missing required fields: brandName, websiteUrl, and industry' },
        { status: 400 }
      );
    }

    // Determine language preference (from body or cookie)
    let preferredLanguage = language || 'en';
    if (!language) {
      // Try to get from cookies
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split('; ').reduce((acc, cookie) => {
          const [key, value] = cookie.split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        const cookieLanguage = cookies['preferred-language'];
        if (cookieLanguage === 'he' || cookieLanguage === 'en') {
          preferredLanguage = cookieLanguage;
        }
      }
    }

    console.log('🤖 Requesting AI suggestions for:', brandName);
    console.log('   Language:', preferredLanguage);

    // Call Supabase Edge Function
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-competitive-intelligence`;
    const edgeFunctionKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!edgeFunctionUrl || !edgeFunctionKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    let response;
    try {
      response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${edgeFunctionKey}`,
        },
        body: JSON.stringify({
          brandName,
          websiteUrl,
          industry,
          language: preferredLanguage,
        }),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Edge Function request timed out');
        return NextResponse.json(
          { error: 'Request timed out. The AI generation is taking longer than expected. Please try again.', success: false },
          { status: 504 }
        );
      }
      console.error('Edge Function fetch error:', fetchError);
      return NextResponse.json(
        { error: fetchError.message || 'Failed to connect to edge function', success: false },
        { status: 500 }
      );
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch (parseError) {
        // If we can't parse the error, use the status text
        error = { error: response.statusText || 'Failed to generate suggestions' };
      }
      console.error('Edge Function error:', error);
      return NextResponse.json(
        { error: error.error || 'Failed to generate suggestions', success: false },
        { status: response.status }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Error parsing edge function response:', parseError);
      return NextResponse.json(
        { error: 'Invalid response from edge function', success: false },
        { status: 500 }
      );
    }

    console.log(`✅ Generated ${data.count?.competitors || 0} competitors and ${data.count?.keywords || 0} keywords`);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate suggestions',
        success: false,
      },
      { status: 500 }
    );
  }
}

