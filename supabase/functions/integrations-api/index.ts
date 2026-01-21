import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WordPress Application Password Encryption Utilities
// Using AES-256-CBC encryption as specified in requirements
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('WORDPRESS_ENCRYPTION_KEY') || 
    'your-super-secret-256-bit-key-here-32-chars'; // 32 chars = 256 bits
  
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

async function encryptWordPressPassword(password: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      data
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt WordPress password');
  }
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

type ValidationResult = {
  valid: boolean;
  error?: string;
  metadata?: Record<string, any>;
};

function sanitizeShopifyStoreDomain(storeUrl: string): string {
  const trimmed = storeUrl.trim().toLowerCase();
  let sanitized = trimmed.replace(/^https?:\/\//, '');
  sanitized = sanitized.replace(/\/.*$/, '');
  return sanitized;
}

async function validateShopifyFullyManaged(clientId: string, clientSecret: string, storeUrl?: string | null): Promise<ValidationResult> {
  if (!storeUrl || storeUrl.trim().length === 0) {
    return { valid: false, error: 'Shopify store URL is required' };
  }

  const sanitizedStore = sanitizeShopifyStoreDomain(storeUrl);

  if (!sanitizedStore.endsWith('.myshopify.com')) {
    return { valid: false, error: 'Shopify store URL must end with .myshopify.com' };
  }

  if (!clientId || clientId.trim().length < 8) {
    return { valid: false, error: 'Shopify Client ID appears invalid. Please double-check and try again.' };
  }

  if (!clientSecret || clientSecret.trim().length < 16) {
    return { valid: false, error: 'Shopify Client Secret appears invalid. Please double-check and try again.' };
  }

  return {
    valid: true,
    metadata: {
      shop: sanitizedStore,
      shopDomain: sanitizedStore,
    }
  };
}

async function validateWordPress(appPassword: string, username: string, siteUrl: string): Promise<ValidationResult> {
  if (!siteUrl || !username || !appPassword) {
    return { valid: false, error: 'WordPress site URL, username, and application password are required' };
  }

  try {
    new URL(siteUrl);
  } catch {
    return { valid: false, error: 'Invalid WordPress site URL format' };
  }

  const cleanUrl = siteUrl.replace(/\/$/, '');

  try {
    const authHeader = btoa(`${username}:${appPassword}`);
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return { 
        valid: true,
        metadata: {
          site_url: cleanUrl,
          username: username
        }
      };
    } else if (response.status === 401) {
      return { valid: false, error: 'Invalid WordPress credentials. Please check your username and application password.' };
    } else if (response.status === 404) {
      return { valid: false, error: 'WordPress REST API not found. Please check your site URL.' };
    } else {
      return { valid: false, error: `WordPress connection failed with status ${response.status}` };
    }
  } catch (error) {
    return { valid: false, error: 'Failed to connect to WordPress site. Please check your site URL.' };
  }
}

async function validatePlatformCredentials(platform: string, credentials: any): Promise<ValidationResult> {
  const { client_id, account_id, client_secret } = credentials;

  if (!client_id || client_id.trim() === '') {
    return { valid: false, error: 'API key is required and cannot be empty' };
  }

  try {
    switch (platform) {
      case 'ShopifyFullyManaged':
        return await validateShopifyFullyManaged(client_id, client_secret, account_id);
      case 'WordPress':
        return await validateWordPress(client_id, client_secret, account_id);
      default:
        return { valid: false, error: 'Unsupported platform' };
    }
  } catch (error) {
    return { valid: false, error: error.message };
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

    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('Unauthorized');
    }

    const method = req.method;
    console.log(`Integration API: ${method} request from user ${user.id}`);

    if (method === 'POST') {
      const body = await req.json();
      return await handleCreateIntegration(supabaseClient, user.id, body);
    } else if (method === 'PUT') {
      const body = await req.json();
      return await handleUpdateIntegration(supabaseClient, user.id, body);
    } else if (method === 'DELETE') {
      const body = await req.json();
      return await handleDeleteIntegration(supabaseClient, user.id, body);
    } else if (method === 'GET') {
      const url = new URL(req.url);
      const integrationId = url.searchParams.get('integrationId');
      if (integrationId) {
        return await handleTestConnection(supabaseClient, user.id, integrationId);
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Integration API error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false 
    }), {
      status: error.message === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCreateIntegration(supabaseClient: any, userId: string, body: any) {
  const { platform, client_id, account_id, client_secret } = body;

  console.log(`Creating integration for platform: ${platform}`);

  if (!platform || !client_id || client_id.trim() === '') {
    throw new Error('Platform and valid API key are required');
  }

  if (platform === 'WordPress') {
    if (!account_id || account_id.trim() === '') {
      throw new Error('WordPress Site URL is required');
    }
    if (!client_secret || client_secret.trim() === '') {
      throw new Error('WordPress Username is required');
    }
    console.log(`[WordPress] Validating credentials - Site URL: ${account_id}, Username: ${client_secret ? '***' : 'MISSING'}, App Password: ${client_id ? '***' : 'MISSING'}`);
  }

  const validation = await validatePlatformCredentials(platform, { client_id, account_id, client_secret });
  
  if (!validation.valid) {
    console.error(`Validation failed for ${platform}:`, validation.error);
    throw new Error(validation.error || 'Invalid credentials - please check your API key');
  }

  const metadata = validation.metadata || {};
  const providedAccountId = account_id?.trim() || null;
  const derivedAccountId = metadata.shopDomain || metadata.shop || metadata.site_url || null;
  
  let cleanedAccountId: string | null = null;
  let accountName: string = `${platform} Integration`;

  if (platform === 'WordPress') {
    cleanedAccountId = providedAccountId || derivedAccountId;
    accountName = metadata.blogName || metadata.shopDomain || providedAccountId || `${platform} Integration`;
  } else {
    cleanedAccountId = derivedAccountId || providedAccountId;
    accountName = metadata.blogName || metadata.shopDomain || providedAccountId || `${platform} Integration`;
  }

  let processedClientId = client_id.trim();
  if (platform === 'WordPress') {
    try {
      processedClientId = await encryptWordPressPassword(processedClientId);
      console.log(`[WordPress] Application Password encrypted successfully`);
    } catch (error) {
      console.error(`[WordPress] Failed to encrypt password:`, error);
      throw new Error('Failed to encrypt WordPress Application Password');
    }
  }

  const insertPayload: Record<string, any> = {
    created_by_user_id: userId,
    platform,
    client_id: processedClientId,
    client_secret: client_secret ? client_secret.trim() : null,
    account_id: cleanedAccountId,
    account_name: accountName,
    status: 'connected',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (platform === 'WordPress') {
    if (!insertPayload.account_id || insertPayload.account_id.trim() === '') {
      throw new Error('WordPress Site URL is required and cannot be empty');
    }
    if (!insertPayload.client_secret || insertPayload.client_secret.trim() === '') {
      throw new Error('WordPress Username is required and cannot be empty');
    }
    console.log(`[WordPress] Saving credentials - Site URL: ${insertPayload.account_id}, Username: ${insertPayload.client_secret ? '***' : 'MISSING'}`);
  }

  if (Object.keys(metadata).length > 0) {
    insertPayload.settings = metadata;
  }

  insertPayload.user_id = userId;

  const { data, error } = await supabaseClient
    .from('integration_credentials')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Database error creating integration:', error);
    throw new Error('Failed to save integration to database');
  }

  console.log(`Integration created successfully: ${data.id}`);

  return new Response(JSON.stringify({ 
    success: true, 
    integration: data,
    message: 'Integration created successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleUpdateIntegration(supabaseClient: any, userId: string, body: any) {
  const { integrationId, client_id, account_id, client_secret } = body;

  if (!integrationId) {
    throw new Error('Integration ID is required');
  }

  const { data: existing, error: fetchError } = await supabaseClient
    .from('integration_credentials')
    .select('*')
    .eq('id', integrationId)
    .eq('created_by_user_id', userId)
    .single();

  if (fetchError || !existing) {
    throw new Error('Integration not found or access denied');
  }

  let validationMetadata: Record<string, any> | undefined;

  if (client_id && client_id.trim() !== '') {
    const validation = await validatePlatformCredentials(existing.platform, { 
      client_id, 
      account_id: account_id || existing.account_id,
      client_secret: client_secret || existing.client_secret
    });
    
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid credentials');
    }

    validationMetadata = validation.metadata;
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
    status: 'connected',
    error_message: null
  };

  if (client_id && client_id.trim() !== '') {
    if (existing.platform === 'WordPress') {
      try {
        updateData.client_id = await encryptWordPressPassword(client_id.trim());
      } catch (error) {
        throw new Error('Failed to encrypt WordPress Application Password');
      }
    } else {
      updateData.client_id = client_id.trim();
    }
  }
  if (account_id !== undefined) {
    if (existing.platform === 'ShopifyFullyManaged') {
      updateData.account_id = account_id ? sanitizeShopifyStoreDomain(account_id) : null;
    } else {
      updateData.account_id = account_id?.trim() || null;
    }
  }
  if (client_secret) updateData.client_secret = client_secret.trim();

  if (validationMetadata) {
    updateData.settings = { ...(existing.settings || {}), ...validationMetadata };
  }

  const { data, error } = await supabaseClient
    .from('integration_credentials')
    .update(updateData)
    .eq('id', integrationId)
    .eq('created_by_user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update integration');
  }

  return new Response(JSON.stringify({ 
    success: true, 
    integration: data,
    message: 'Integration updated successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleDeleteIntegration(supabaseClient: any, userId: string, body: any) {
  const { integrationId } = body;

  if (!integrationId) {
    throw new Error('Integration ID is required');
  }

  const { data: existing } = await supabaseClient
    .from('integration_credentials')
    .select('id, platform, created_by_user_id')
    .eq('id', integrationId)
    .single();

  if (!existing || existing.created_by_user_id !== userId) {
    throw new Error('Integration not found or access denied');
  }

  const { error: deleteError } = await supabaseClient
    .from('integration_credentials')
    .delete()
    .eq('id', integrationId)
    .eq('created_by_user_id', userId);

  if (deleteError) {
    throw new Error('Failed to delete integration from database');
  }

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Integration deleted successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleTestConnection(supabaseClient: any, userId: string, integrationId: string) {
  const { data: integration, error: fetchError } = await supabaseClient
    .from('integration_credentials')
    .select('*')
    .eq('id', integrationId)
    .eq('created_by_user_id', userId)
    .single();

  if (fetchError || !integration) {
    throw new Error('Integration not found or access denied');
  }

  let testClientId = integration.client_id;
  if (integration.platform === 'WordPress') {
    try {
      testClientId = await decryptWordPressPassword(integration.client_id);
    } catch (error) {
      console.warn(`[WordPress] Failed to decrypt password for test, using as-is:`, error);
    }
  }

  const testResult = await validatePlatformCredentials(integration.platform, {
    client_id: testClientId,
    account_id: integration.account_id,
    client_secret: integration.client_secret
  });

  const updatePayload: Record<string, any> = {
    status: testResult.valid ? 'connected' : 'error',
    error_message: testResult.valid ? null : testResult.error,
    updated_at: new Date().toISOString()
  };

  await supabaseClient
    .from('integration_credentials')
    .update(updatePayload)
    .eq('id', integrationId);

  return new Response(JSON.stringify({ 
    valid: testResult.valid,
    success: testResult.valid,
    message: testResult.valid ? 'Connection successful' : testResult.error
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
