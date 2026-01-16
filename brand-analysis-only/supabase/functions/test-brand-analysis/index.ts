import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing brand analysis with minimal setup...');
    
    // Test 1: Check if OpenAI API key exists
    console.log('OpenAI API Key available:', !!openAIApiKey);
    
    // Test 2: Try a simple OpenAI call
    if (openAIApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: 'What are the top 3 skincare companies?' }
          ],
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('OpenAI test successful:', data.choices[0].message.content);
      } else {
        console.error('OpenAI test failed:', response.statusText);
      }
    }

    // Test 3: Check database connection
    const { data: projects, error } = await supabase
      .from('brand_analysis_projects')
      .select('*')
      .eq('brand_name', 'Yalmeh')
      .limit(1);
    
    console.log('Database test - Projects found:', projects?.length || 0);
    if (error) console.error('Database error:', error);

    // Test 4: Try to create a session
    if (projects && projects.length > 0) {
      const project = projects[0];
      console.log('Testing session creation for project:', project.id);
      
      const { data: session, error: sessionError } = await supabase
        .from('brand_analysis_sessions')
        .insert({
          project_id: project.id,
          session_name: 'Test Analysis',
          status: 'running',
          started_at: new Date().toISOString(),
          total_queries: 5
        })
        .select()
        .single();
      
      if (sessionError) {
        console.error('Session creation failed:', sessionError);
      } else {
        console.log('Session created successfully:', session.id);
        
        // Update session to completed
        await supabase
          .from('brand_analysis_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            results_summary: {
              total_mentions: 3,
              successful_queries: 5,
              failed_queries: 0,
              api_status: { chatgpt: true }
            }
          })
          .eq('id', session.id);
        
        console.log('Test analysis session completed');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Test completed - check logs for details',
      openai_available: !!openAIApiKey,
      projects_found: projects?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test failed:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});