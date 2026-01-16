import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// CORS headers for all responses - ChatGPT requires these
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// System user ID for ChatGPT actions (using service role bypasses RLS)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// Helper to check if path is root
function isRootPath(pathname: string): boolean {
  return pathname === '/' || pathname === '' || pathname === '/api' || pathname === '/api/' || 
         pathname === '/brand-analysis-api' || pathname === '/brand-analysis-api/';
}

// Helper to parse URL path
// Handles both direct API calls (/api/brand-analysis/...) and Supabase Edge Function calls
function parsePath(url: string): { path: string; jobId?: string } {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const pathParts = pathname.split('/').filter(p => p);
    
    // Check for root path first
    if (isRootPath(pathname)) {
      return { path: 'root' };
    }
    
    // PRIORITY 1: Parse /api/brand-analysis/... paths (for Cloudflare tunnel/proxy)
    // This handles paths like /api/brand-analysis/initiate
    if (pathParts.length >= 3 && pathParts[0] === 'api' && pathParts[1] === 'brand-analysis') {
      if (pathParts[2] === 'initiate') {
        return { path: 'initiate' };
      } else if (pathParts[2] === 'status' && pathParts[3]) {
        return { path: 'status', jobId: pathParts[3] };
      } else if (pathParts[2] === 'result' && pathParts[3]) {
        return { path: 'result', jobId: pathParts[3] };
      }
    }
    
    // PRIORITY 2: Parse Supabase Edge Function paths
    // Handle paths like /brand-analysis-api/api/brand-analysis/initiate
    const functionIndex = pathParts.findIndex(p => p === 'brand-analysis-api');
    if (functionIndex >= 0) {
      // Check if there's an /api/brand-analysis/... path after the function name
      if (pathParts.length > functionIndex + 3 && 
          pathParts[functionIndex + 1] === 'api' && 
          pathParts[functionIndex + 2] === 'brand-analysis') {
        const action = pathParts[functionIndex + 3];
        const jobId = pathParts[functionIndex + 4];
        
        if (action === 'initiate') {
          return { path: 'initiate' };
        } else if (action === 'status' && jobId) {
          return { path: 'status', jobId };
        } else if (action === 'result' && jobId) {
          return { path: 'result', jobId };
        }
      }
      
      // Handle direct paths like /brand-analysis-api/initiate
      if (pathParts.length > functionIndex + 1) {
        const action = pathParts[functionIndex + 1];
        const jobId = pathParts[functionIndex + 2];
        
        if (action === 'initiate') {
          return { path: 'initiate' };
        } else if (action === 'status' && jobId) {
          return { path: 'status', jobId };
        } else if (action === 'result' && jobId) {
          return { path: 'result', jobId };
        }
      }
    }
    
    // PRIORITY 3: Handle root-level paths (if function is mounted at root)
    if (pathParts.length >= 2 && pathParts[0] === 'brand-analysis') {
      if (pathParts[1] === 'initiate') {
        return { path: 'initiate' };
      } else if (pathParts[1] === 'status' && pathParts[2]) {
        return { path: 'status', jobId: pathParts[2] };
      } else if (pathParts[1] === 'result' && pathParts[2]) {
        return { path: 'result', jobId: pathParts[2] };
      }
    }
    
    return { path: 'unknown' };
  } catch (error) {
    console.error('Path parsing error:', error);
    return { path: 'unknown' };
  }
}

// Root route handler - returns API info
// Optimized for fast response to avoid ChatGPT Actions timeout
// ChatGPT Actions REQUIRES text/event-stream for connector validation
// Always return SSE format to satisfy ChatGPT Actions requirements
function handleRoot() {
  const responseData = {
    success: true,
    message: 'Outranker Brand Analysis API is alive',
    version: '1.0.0',
    endpoints: {
      initiate: 'POST /api/brand-analysis/initiate',
      status: 'GET /api/brand-analysis/status/{jobId}',
      result: 'GET /api/brand-analysis/result/{jobId}'
    },
    description: 'API for analyzing brand visibility across AI platforms (ChatGPT, Claude, Gemini)'
  };
  
  // Always return SSE format for ChatGPT Actions connector compatibility
  // SSE format: data: {json}\n\n
  const sseData = `data: ${JSON.stringify(responseData)}\n\n`;
  
  return new Response(sseData, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    },
  });
}

// POST /api/brand-analysis/initiate
// OPTIMIZED: Returns immediately (< 1 second) - all processing happens in background
async function initiateAnalysis(body: any) {
  try {
    const { brand_name, link, industry, competitors, country } = body;

    // Fast validation
    if (!brand_name || !link || !industry) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: brand_name, link, and industry are required',
        success: false
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Normalize website URL (fast operation)
    let websiteUrl = link.trim();
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = 'https://' + websiteUrl;
    }

    // OPTIMIZED: Create project quickly - use simple insert (fastest)
    // If duplicate, processor will handle it in background
    const projectData = {
      user_id: SYSTEM_USER_ID,
      brand_name: brand_name.trim(),
      website_url: websiteUrl,
      industry: industry.trim(),
      competitors: competitors && Array.isArray(competitors) ? competitors : (competitors ? [competitors] : []),
      target_keywords: [],
      target_languages: ['en-US'],
      target_countries: country ? [country] : [],
      active_platforms: ['chatgpt', 'claude', 'gemini'],
      status: 'active',
      query_generation_mode: 'ai-only',
    };

    // Fast insert - don't check for duplicates (processor will handle)
    const { data: project, error: projectError } = await supabase
      .from('brand_analysis_projects')
      .insert(projectData)
      .select('id')
      .single();

    // If insert fails (duplicate or other error), use a temporary ID
    // Processor will find or create the project in background
    let finalProjectId: string;
    if (projectError || !project) {
      // Generate a temporary ID - processor will resolve the actual project
      finalProjectId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      console.log('Project insert failed, using temp ID. Processor will resolve:', projectError?.message);
    } else {
      finalProjectId = project.id;
    }

    // Create session immediately (fast DB operation)
    const sessionData = {
      project_id: finalProjectId,
      status: 'pending',
      started_at: new Date().toISOString(),
      total_queries: 0,
      completed_queries: 0,
    };

    const { data: session, error: sessionError } = await supabase
      .from('brand_analysis_sessions')
      .insert(sessionData)
      .select('id')
      .single();

    // If session creation fails, generate a fallback ID and still return success
    // This ensures we ALWAYS return quickly (< 1 second)
    let jobId: string;
    if (sessionError || !session) {
      // Generate fallback ID using timestamp + random
      jobId = `job-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      console.error('Session creation failed, using fallback ID:', sessionError?.message);
    } else {
      jobId = session.id;
    }

    // Start processor in background - TRULY fire-and-forget
    // Don't await anything - just fire and forget
    const backgroundTask = startAnalysisInBackground(
      finalProjectId, 
      jobId,
      session ? undefined : {
        brand_name: brand_name.trim(),
        link: websiteUrl,
        industry: industry.trim(),
        competitors: projectData.competitors,
        country: country
      }
    ).catch(() => {}); // Silently fail - never block response

    // Use EdgeRuntime.waitUntil if available to ensure background task runs after response
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundTask);
    }

    // Return IMMEDIATELY - this is the critical part for ChatGPT Actions
    // Must return in < 1 second
    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      message: 'Brand analysis started. Use status endpoint to check progress.',
      status: 'pending'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Initiate analysis error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to initiate analysis',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Start the analysis in background (non-blocking)
// This function is called asynchronously and never blocks the main response
async function startAnalysisInBackground(projectId: string, sessionId: string, fallbackData?: any) {
  try {
    // Update session status to processing (non-blocking - don't await if it fails)
    supabase
      .from('brand_analysis_sessions')
      .update({ status: 'processing' })
      .eq('id', sessionId)
      .then(() => {})
      .catch(() => {}); // Ignore errors - don't block

    // Call the brand-analysis-processor function
    // Use a timeout to prevent hanging
    const processorUrl = `${supabaseUrl}/functions/v1/brand-analysis-processor`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for the call itself
    
    try {
      const response = await fetch(processorUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          sessionId,
          platforms: ['chatgpt', 'claude', 'gemini'],
          useAIGenerated: true,
          customQueries: [],
          ...(fallbackData && { fallbackData }) // Include fallback data if project creation failed
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Don't wait for response body - just check status
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Analysis processor failed: ${errorText}`);
      }

      // Don't await the JSON parsing - just fire the request
      response.json().then(result => {
        if (!result.success) {
          console.error('Processor returned error:', result.error);
        } else {
          console.log(`Analysis started for session ${sessionId}`);
        }
      }).catch(() => {}); // Ignore parsing errors

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Processor call timed out, but analysis will continue in background');
      } else {
        throw fetchError;
      }
    }

  } catch (error) {
    console.error('Background analysis start error (non-critical):', error);
    // Update session to failed status in background (don't await)
    supabase
      .from('brand_analysis_sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId)
      .then(() => {})
      .catch(() => {}); // Ignore errors
  }
}

// GET /api/brand-analysis/status/{jobId}
// Returns immediately with current status, even if processing isn't complete
async function getStatus(jobId: string) {
  try {
    if (!jobId) {
      return new Response(JSON.stringify({
        error: 'Job ID is required',
        success: false
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from('brand_analysis_sessions')
      .select('id, status, total_queries, completed_queries, started_at, completed_at, results_summary')
      .eq('id', jobId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({
        error: 'Job not found',
        success: false
      }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const progress = session.total_queries && session.total_queries > 0
      ? (session.completed_queries || 0) / session.total_queries
      : 0;

    const status = session.status || 'pending';
    const isCompleted = status === 'completed';
    const isProcessing = status === 'processing' || status === 'pending';

    // Response format matches OpenAPI spec - returns immediately
    return new Response(JSON.stringify({
      success: true,
      status: status,
      progress: Math.round(progress * 100),
      message: isCompleted 
        ? 'Analysis completed' 
        : isProcessing 
        ? 'Analysis is in progress. Please check again later.' 
        : 'Analysis status: ' + status,
      partialResults: !isCompleted ? {
        completed_queries: session.completed_queries || 0,
        total_queries: session.total_queries || 0,
        started_at: session.started_at
      } : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get status error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/brand-analysis/result/{jobId}
// Returns immediately - if not completed, returns status message instead of waiting
async function getResults(jobId: string) {
  try {
    if (!jobId) {
      return new Response(JSON.stringify({
        error: 'Job ID is required',
        success: false
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get session to check status - quick query, no waiting
    const { data: session, error: sessionError } = await supabase
      .from('brand_analysis_sessions')
      .select('id, status, project_id, total_queries, completed_queries, results_summary')
      .eq('id', jobId)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({
        error: 'Job not found',
        success: false
      }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // If not completed, return status message immediately instead of waiting
    if (session.status !== 'completed') {
      const status = session.status || 'pending';
      return new Response(JSON.stringify({
        success: true,
        results: {
          status: status,
          is_completed: false,
          message: status === 'processing' || status === 'pending'
            ? 'Analysis is still in progress. Please check the status endpoint and try again later.'
            : `Analysis status: ${status}. Results are not yet available.`,
          summary: {
            total_results: 0,
            mentions_found: 0,
            mention_rate: 0,
            platforms: [],
          },
          data: [],
          by_platform: {},
          progress: session.total_queries && session.total_queries > 0
            ? Math.round(((session.completed_queries || 0) / session.total_queries) * 100)
            : 0,
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all results for this session
    const { data: results, error: resultsError } = await supabase
      .from('ai_platform_responses')
      .select('*')
      .eq('session_id', jobId)
      .order('created_at', { ascending: false });

    if (resultsError) {
      console.error('Results query error:', resultsError);
      return new Response(JSON.stringify({
        error: `Failed to fetch results: ${resultsError.message}`,
        success: false
      }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Transform results to a cleaner format
    const formattedResults = (results || []).map((item: any) => {
      const metadata = item.response_metadata || {};
      return {
        id: item.id,
        platform: item.platform,
        query: item.prompt,
        response: item.response,
        brand_mentioned: metadata.brand_mentioned || false,
        mention_position: metadata.mention_position || null,
        sentiment_score: metadata.sentiment_score || null,
        competitors_found: metadata.competitors_found || [],
        mention_context: metadata.mention_context || null,
        sources: metadata.sources || [],
        created_at: item.created_at,
      };
    });

    // Calculate summary statistics
    const totalResults = formattedResults.length;
    const mentionsFound = formattedResults.filter((r: any) => r.brand_mentioned).length;
    const mentionRate = totalResults > 0 ? mentionsFound / totalResults : 0;

    // Group by platform
    const byPlatform: Record<string, any> = {};
    formattedResults.forEach((result: any) => {
      if (!byPlatform[result.platform]) {
        byPlatform[result.platform] = {
          platform: result.platform,
          total_queries: 0,
          mentions: 0,
          results: []
        };
      }
      byPlatform[result.platform].total_queries++;
      byPlatform[result.platform].results.push(result);
      if (result.brand_mentioned) {
        byPlatform[result.platform].mentions++;
      }
    });

    // Response format matches OpenAPI spec
    return new Response(JSON.stringify({
      success: true,
      results: {
        status: session.status,
        is_completed: session.status === 'completed',
        summary: {
          total_results: totalResults,
          mentions_found: mentionsFound,
          mention_rate: Math.round(mentionRate * 100) / 100,
          platforms: Object.keys(byPlatform),
        },
        data: formattedResults,
        by_platform: byPlatform,
        progress: session.total_queries && session.total_queries > 0
          ? Math.round(((session.completed_queries || 0) / session.total_queries) * 100)
          : 0,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get results error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Main serve function
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fast path for root GET requests - skip parsing if possible
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // Quick check for root path before full parsing
    if (req.method === 'GET' && (
      pathname === '/' || 
      pathname === '' || 
      pathname === '/brand-analysis-api' || 
      pathname === '/brand-analysis-api/' ||
      pathname.endsWith('/brand-analysis-api') ||
      (pathname.split('/').filter(p => p).length === 1 && pathname.split('/').filter(p => p)[0] === 'brand-analysis-api')
    )) {
      return handleRoot();
    }
    
    // Parse path for other requests
    let { path, jobId } = parsePath(req.url);

    // Also check query parameters as fallback
    if (!jobId && url.searchParams.has('jobId')) {
      jobId = url.searchParams.get('jobId') || undefined;
    }
    if (path === 'unknown' && url.searchParams.has('action')) {
      path = url.searchParams.get('action') || 'unknown';
    }

    console.log(`Request: ${req.method} ${path}${jobId ? ` (jobId: ${jobId})` : ''}`);

    // Handle root path (if not caught by fast path)
    if (path === 'root' && req.method === 'GET') {
      return handleRoot();
    }

    // Route to appropriate handler
    if (req.method === 'POST' && path === 'initiate') {
      const body = await req.json();
      return await initiateAnalysis(body);
    } else if (req.method === 'GET' && path === 'status' && jobId) {
      return await getStatus(jobId);
    } else if (req.method === 'GET' && path === 'result' && jobId) {
      return await getResults(jobId);
    } else {
      // Return 404 for invalid paths (not 403) to help with debugging
      const urlObj = new URL(req.url);
      console.error(`Invalid request: ${req.method} ${req.url}, parsed path: ${path}, jobId: ${jobId}`);
      return new Response(JSON.stringify({
        error: 'Invalid endpoint or method',
        success: false,
        message: `The requested path does not exist. Available endpoints are: POST /api/brand-analysis/initiate, GET /api/brand-analysis/status/{jobId}, GET /api/brand-analysis/result/{jobId}`,
        available_endpoints: [
          'POST /api/brand-analysis/initiate',
          'GET /api/brand-analysis/status/{jobId}',
          'GET /api/brand-analysis/result/{jobId}'
        ],
        received: {
          method: req.method,
          pathname: urlObj.pathname,
          path: path,
          jobId: jobId,
          full_url: req.url
        }
      }), {
        status: 404,
        headers: corsHeaders,
      });
    }
  } catch (error) {
    console.error('Request error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

