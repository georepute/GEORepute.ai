// OAuth Utilities for Shopify Fully Managed
export const getOAuthUrl = async (
  platform: string,
  credentials?: { clientId: string; clientSecret: string; shop?: string }
): Promise<string | null> => {
  const redirectUri = `${window.location.origin}/dashboard/settings`;
  
  if (platform === 'ShopifyFullyManaged') {
    if (!credentials) {
      throw new Error('Credentials required for Shopify Fully Managed');
    }
    const shop = credentials.shop?.toLowerCase().trim();
    if (!shop || !shop.endsWith('.myshopify.com')) {
      throw new Error('Shopify store URL must end with .myshopify.com');
    }
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    const statePayload = {
      platform,
      shop,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    };
    const state = encodeURIComponent(JSON.stringify(statePayload));

    localStorage.setItem('oauth_shop', shop);
    localStorage.setItem('oauth_platform', 'ShopifyFullyManaged');
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_client_id', credentials.clientId);
    localStorage.setItem('oauth_client_secret', credentials.clientSecret);

    return `https://${shop}/admin/oauth/authorize?client_id=${encodeURIComponent(credentials.clientId)}&scope=read_content,write_content&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  return null;
};

export const isOAuthPlatform = (platform: string): boolean => {
  return ['ShopifyFullyManaged'].includes(platform);
};
