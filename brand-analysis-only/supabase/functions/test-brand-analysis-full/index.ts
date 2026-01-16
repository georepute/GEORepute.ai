import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to get API key from database or environment
async function getApiKey(keyType: string): Promise<{ key: string | null; source: string }> {
  try {
    // First try database
    const { data, error } = await supabase
      .from('admin_api_keys')
      .select('encrypted_value')
      .eq('key_type', keyType)
      .eq('is_active', true)
      .maybeSingle();

    if (data?.encrypted_value) {
      // Decrypt base64 encoded key
      const decrypted = atob(data.encrypted_value);
      return { key: decrypted, source: 'database' };
    }

    // Fallback to environment variable
    const envKey = Deno.env.get(`${keyType.toUpperCase()}_API_KEY`);
    if (envKey) {
      return { key: envKey, source: 'environment' };
    }

    return { key: null, source: 'none' };
  } catch (error) {
    console.error(`Error retrieving ${keyType} API key:`, error);
    // Fallback to environment
    const envKey = Deno.env.get(`${keyType.toUpperCase()}_API_KEY`);
    return { key: envKey || null, source: envKey ? 'environment_fallback' : 'none' };
  }
}

interface TestResult {
  platform: string;
  success: boolean;
  responseTime?: number;
  responseLength?: number;
  error?: string;
  brandMentioned?: boolean;
  competitorsFound?: string[];
}

async function testPlatform(platform: string, prompt: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    let response: string | null = null;

    // Get API key for platform
    const keyType = platform === 'chatgpt' ? 'openai' : platform;
    const { key: apiKey, source } = await getApiKey(keyType);
    
    console.log(`${platform}: API key ${source} (${apiKey ? 'found' : 'missing'})`);

    if (platform === 'chatgpt' && apiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful business research assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      response = data.choices[0].message.content;
    }
    
    if (platform === 'claude' && apiKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        }),
      });

      if (!res.ok) {
        throw new Error(`Claude API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      response = data.content[0].text;
    }

    if (platform === 'gemini' && apiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts) {
        response = data.candidates[0].content.parts.map(p => p.text).join('');
      }
    }

    if (platform === 'perplexity' && apiKey) {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: 'You are a helpful business research assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        throw new Error(`Perplexity API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      response = data.choices?.[0]?.message?.content;
    }
    
    if (platform === 'groq' && apiKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: 'You are a helpful business research assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        throw new Error(`Groq API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      response = data.choices[0].message.content;
    }

    if (!response) {
      throw new Error(`No API key available for ${platform}`);
    }

    const responseTime = Date.now() - startTime;

    // Analyze response for brand mentions
    const lowerResponse = response.toLowerCase();
    const brandMentioned = lowerResponse.includes('stripe');
    const competitorsFound = ['paypal', 'square', 'adyen'].filter(c => lowerResponse.includes(c));

    return {
      platform,
      success: true,
      responseTime,
      responseLength: response.length,
      brandMentioned,
      competitorsFound,
    };
  } catch (error) {
    return {
      platform,
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime,
    };
  }
}

async function testDatabaseIntegration() {
  try {
    console.log('Testing database integration...');

    // Create a test project
    const { data: project, error: projectError } = await supabase
      .from('brand_analysis_projects')
      .insert({
        brand_name: 'Test Brand',
        website_url: 'https://test.com',
        industry: 'Technology',
        platforms: ['chatgpt'],
        status: 'active'
      })
      .select()
      .single();

    if (projectError) throw new Error(`Project creation failed: ${projectError.message}`);
    console.log('✅ Test project created:', project.id);

    // Create a test session
    const { data: session, error: sessionError } = await supabase
      .from('brand_analysis_sessions')
      .insert({
        project_id: project.id,
        session_name: 'Test Session',
        status: 'running',
        started_at: new Date().toISOString(),
        total_queries: 1
      })
      .select()
      .single();

    if (sessionError) throw new Error(`Session creation failed: ${sessionError.message}`);
    console.log('✅ Test session created:', session.id);

    // Insert a test response
    const { data: response, error: responseError } = await supabase
      .from('ai_platform_responses')
      .insert({
        session_id: session.id,
        platform: 'chatgpt',
        query_text: 'Test query',
        response_text: 'Test response about Stripe payments and PayPal integration',
        response_metadata: {
          brand_mentioned: true,
          sentiment_score: 0.8,
          competitors_found: ['PayPal'],
          sources: []
        },
        query_index: 0,
        status: 'completed'
      })
      .select()
      .single();

    if (responseError) throw new Error(`Response insertion failed: ${responseError.message}`);
    console.log('✅ Test response inserted:', response.id);

    // Test upsert_brand_analysis_sources function
    const { data: sourceData, error: sourceError } = await supabase.rpc('upsert_brand_analysis_sources', {
      p_project_id: project.id,
      p_session_id: session.id,
      p_platforms: ['chatgpt'],
      p_url: 'https://stripe.com',
      p_domain: 'stripe.com',
      p_title: 'Stripe - Payment Processing Platform',
      p_metadata: {}
    });

    if (sourceError) throw new Error(`Source upsert failed: ${sourceError.message}`);
    console.log('✅ Source upserted successfully');

    // Verify source was created
    const { data: sources, error: sourcesError } = await supabase
      .from('brand_analysis_sources')
      .select('*')
      .eq('project_id', project.id);

    if (sourcesError) throw new Error(`Source query failed: ${sourcesError.message}`);
    console.log('✅ Sources found:', sources?.length || 0);

    // Clean up test data
    await supabase.from('brand_analysis_sources').delete().eq('project_id', project.id);
    await supabase.from('ai_platform_responses').delete().eq('session_id', session.id);
    await supabase.from('brand_analysis_sessions').delete().eq('id', session.id);
    await supabase.from('brand_analysis_projects').delete().eq('id', project.id);
    console.log('✅ Test data cleaned up');

    return {
      success: true,
      sessionCreated: true,
      responseInserted: true,
      sourceUpserted: true,
      cleanupCompleted: true,
    };
  } catch (error) {
    console.error('Database integration test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function analyzeOrphanedData() {
  try {
    // Check for orphaned responses
    const { count: orphanedResponses } = await supabase
      .from('ai_platform_responses')
      .select('*', { count: 'exact', head: true })
      .is('session_id', null);

    // Check for orphaned sources
    const { count: orphanedSources } = await supabase
      .from('brand_analysis_sources')
      .select('*', { count: 'exact', head: true })
      .is('project_id', null);

    // Check for stuck sessions
    const { data: stuckSessions } = await supabase
      .from('brand_analysis_sessions')
      .select('id, created_at')
      .eq('status', 'running')
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

    // Check for invalid metadata
    const { data: invalidMetadata } = await supabase
      .from('ai_platform_responses')
      .select('id')
      .is('response_metadata', null)
      .limit(10);

    return {
      orphanedResponses: orphanedResponses || 0,
      orphanedSources: orphanedSources || 0,
      stuckSessions: stuckSessions?.length || 0,
      invalidMetadata: invalidMetadata?.length || 0,
    };
  } catch (error) {
    console.error('Error analyzing orphaned data:', error);
    return { error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Brand Analysis Full Test Started ===');
    
    // Test 1: Check API Keys from both sources
    const openaiKey = await getApiKey('openai');
    const claudeKey = await getApiKey('claude');
    const geminiKey = await getApiKey('gemini');
    const perplexityKey = await getApiKey('perplexity');
    const groqKey = await getApiKey('groq');
    
    const apiKeys = {
      openai: { available: !!openaiKey.key, source: openaiKey.source },
      claude: { available: !!claudeKey.key, source: claudeKey.source },
      gemini: { available: !!geminiKey.key, source: geminiKey.source },
      perplexity: { available: !!perplexityKey.key, source: perplexityKey.source },
      groq: { available: !!groqKey.key, source: groqKey.source },
    };
    console.log('API Keys:', apiKeys);

    // Test 2: Test Each Platform
    const testPrompt = 'Tell me about Stripe as a payment processor. Keep it brief (2-3 sentences).';
    const platformTests: TestResult[] = [];

    for (const platform of ['chatgpt', 'claude', 'gemini', 'perplexity', 'groq']) {
      console.log(`Testing ${platform}...`);
      const result = await testPlatform(platform, testPrompt);
      platformTests.push(result);
      console.log(`${platform} result:`, result.success ? '✅' : '❌', result.error || `${result.responseTime}ms`);
    }

    // Test 3: Database Integration
    console.log('Testing database integration...');
    const databaseTest = await testDatabaseIntegration();

    // Test 4: Analyze Orphaned Data
    console.log('Analyzing orphaned data...');
    const orphanedData = await analyzeOrphanedData();

    // Generate recommendations
    const recommendations: string[] = [];
    
    Object.entries(apiKeys).forEach(([platform, info]: [string, any]) => {
      if (!info.available) {
        recommendations.push(`Add missing API key for ${platform} to database`);
      }
    });

    if (orphanedData.stuckSessions > 0) {
      recommendations.push(`Fix ${orphanedData.stuckSessions} sessions stuck in 'running' status`);
    }

    if (orphanedData.orphanedResponses > 0) {
      recommendations.push(`Clean up ${orphanedData.orphanedResponses} orphaned responses`);
    }

    if (orphanedData.orphanedSources > 0) {
      recommendations.push(`Clean up ${orphanedData.orphanedSources} orphaned sources`);
    }

    const successfulPlatforms = platformTests.filter(t => t.success).length;
    const avgResponseTime = platformTests
      .filter(t => t.success && t.responseTime)
      .reduce((sum, t) => sum + (t.responseTime || 0), 0) / successfulPlatforms || 0;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        platformsAvailable: Object.values(apiKeys).filter((k: any) => k.available).length,
        platformsTested: platformTests.length,
        platformsSuccessful: successfulPlatforms,
        databaseIntegration: databaseTest.success,
        avgResponseTime: Math.round(avgResponseTime),
      },
      tests: {
        api_keys: apiKeys,
        platform_tests: platformTests,
        database: databaseTest,
        orphaned_data: orphanedData,
      },
      recommendations,
    };

    console.log('=== Test Summary ===');
    console.log(`✅ Platforms Available: ${Object.values(apiKeys).filter((k: any) => k.available).length}/5`);
    console.log(`✅ Platforms Successful: ${successfulPlatforms}/${platformTests.length}`);
    console.log(`✅ Database Integration: ${databaseTest.success ? 'PASSED' : 'FAILED'}`);
    console.log(`⚠️  Recommendations: ${recommendations.length}`);
    console.log('=== Brand Analysis Full Test Completed ===');

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test failed:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
