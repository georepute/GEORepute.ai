import { NextRequest, NextResponse } from "next/server";

// Clean prompt for Pixabay search
function cleanPromptForSearch(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[?!.,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, keywords } = body;

    console.log('📸 Pixabay request:', { prompt: prompt?.slice(0, 50), keywords });

    if (!prompt && (!keywords || keywords.length === 0)) {
      return NextResponse.json(
        { error: 'Either prompt or keywords array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PIXABAY_API_KEY;
    console.log('🔑 API Key exists:', !!apiKey, 'Length:', apiKey?.length);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Pixabay API key not configured' },
        { status: 500 }
      );
    }

    // Use prompt directly or keywords as fallback
    let searchQuery: string;
    if (prompt) {
      searchQuery = cleanPromptForSearch(prompt);
    } else {
      searchQuery = keywords.slice(0, 3).join(' ').toLowerCase();
    }

    console.log('🔍 Search query:', searchQuery);

    // Build Pixabay API URL
    const pixabayUrl = new URL('https://pixabay.com/api/');
    pixabayUrl.searchParams.set('key', apiKey);
    pixabayUrl.searchParams.set('q', searchQuery);
    pixabayUrl.searchParams.set('image_type', 'photo');
    pixabayUrl.searchParams.set('per_page', '5');
    pixabayUrl.searchParams.set('safesearch', 'true');
    pixabayUrl.searchParams.set('orientation', 'horizontal');

    console.log('🌐 Fetching from Pixabay...');

    const pixabayResponse = await fetch(pixabayUrl.toString());

    if (!pixabayResponse.ok) {
      const errorText = await pixabayResponse.text();
      console.error('❌ Pixabay API error:', pixabayResponse.status, errorText);
      return NextResponse.json(
        { error: `Pixabay API error: ${pixabayResponse.status}`, details: errorText },
        { status: 502 }
      );
    }

    const data = await pixabayResponse.json();
    console.log('✅ Pixabay response:', { total: data.totalHits, returned: data.hits?.length });

    const images = data.hits?.map((hit: any) => ({
      id: hit.id,
      previewURL: hit.previewURL,
      webformatURL: hit.webformatURL,
      largeImageURL: hit.largeImageURL,
      tags: hit.tags,
      user: hit.user,
      pageURL: hit.pageURL,
      likes: hit.likes,
      downloads: hit.downloads,
    })) || [];

    return NextResponse.json({
      success: true,
      query: searchQuery,
      total: data.totalHits,
      images,
    });
  } catch (error) {
    console.error('❌ Pixabay images error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

