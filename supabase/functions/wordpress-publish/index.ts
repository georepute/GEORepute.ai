import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WordPress password decryption (same as integrations-api)
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('WORDPRESS_ENCRYPTION_KEY') || 
    'your-super-secret-256-bit-key-here-32-chars';
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString.padEnd(32, '0').slice(0, 32));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptWordPressPassword(encryptedPassword: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedPassword), c => c.charCodeAt(0));
    const iv = combined.slice(0, 16);
    const encrypted = combined.slice(16);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encrypted
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt WordPress password');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { integrationId, title, content } = await req.json();

    if (!integrationId || !title || !content) {
      throw new Error('integrationId, title, and content are required');
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integration_credentials')
      .select('*')
      .eq('id', integrationId)
      .eq('created_by_user_id', user.id)
      .eq('platform', 'WordPress')
      .single();

    if (integrationError || !integration) {
      throw new Error('WordPress integration not found');
    }

    // Decrypt password
    const appPassword = await decryptWordPressPassword(integration.client_id);
    const username = integration.client_secret;
    const siteUrl = integration.account_id;

    if (!siteUrl || !username || !appPassword) {
      throw new Error('WordPress credentials incomplete');
    }

    // Convert content to HTML if it's markdown (basic conversion)
    let htmlContent = content;
    // Simple markdown to HTML conversion
    htmlContent = htmlContent
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    // Publish to WordPress REST API
    const cleanUrl = siteUrl.replace(/\/$/, '');
    const authHeaderValue = btoa(`${username}:${appPassword}`);

    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeaderValue}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
        content: htmlContent,
        status: 'publish', // 'publish', 'draft', 'pending', 'private'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `WordPress API error: ${response.status}`);
    }

    const postData = await response.json();
    const postUrl = postData.link || `${cleanUrl}/${postData.slug}`;

    return new Response(JSON.stringify({
      success: true,
      url: postUrl,
      postId: postData.id,
      message: 'Published to WordPress successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('WordPress publish error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to publish to WordPress',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
