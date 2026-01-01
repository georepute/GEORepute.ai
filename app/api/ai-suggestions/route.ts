/**
 * API Route for AI-Powered Competitive Intelligence Suggestions
 * Generates competitors and keywords using OpenAI via Edge Function
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandName, websiteUrl, industry } = body;

    // Validate input
    if (!brandName || !websiteUrl || !industry) {
      return NextResponse.json(
        { error: 'Missing required fields: brandName, websiteUrl, and industry' },
        { status: 400 }
      );
    }

    console.log('🤖 Requesting AI suggestions for:', brandName);

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

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${edgeFunctionKey}`,
      },
      body: JSON.stringify({
        brandName,
        websiteUrl,
        industry,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Edge Function error:', error);
      return NextResponse.json(
        { error: error.error || 'Failed to generate suggestions' },
        { status: response.status }
      );
    }

    const data = await response.json();

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

