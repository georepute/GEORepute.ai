"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { IntegrationCredential } from "@/types/integrations";
import { getOAuthUrl, isOAuthPlatform } from "./OAuthUtils";
import { WordPressConfiguration } from "./WordPressConfiguration";
import { ShopifyFullyManagedConfiguration } from "./ShopifyFullyManagedConfiguration";
import toast from "react-hot-toast";

interface ConnectIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIntegrationAdded: (integration: IntegrationCredential) => void;
  preselectedPlatform?: string | null;
}

export const ConnectIntegrationDialog = ({
  open,
  onOpenChange,
  onIntegrationAdded,
  preselectedPlatform
}: ConnectIntegrationDialogProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    client_secret: '',
    account_id: '',
  });

  // Set preselected platform when dialog opens
  useEffect(() => {
    if (preselectedPlatform && open) {
      setSelectedPlatform(preselectedPlatform);
    }
  }, [preselectedPlatform, open]);

  // Handle OAuth callback when returning from Shopify redirect
  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const platform = localStorage.getItem('oauth_platform');
        const shop = localStorage.getItem('oauth_shop');

        if (code && state && platform === 'ShopifyFullyManaged' && shop) {
          console.log('Processing Shopify Fully Managed OAuth callback from redirect');

          if (!open) {
            onOpenChange(true);
          }
          setSelectedPlatform('ShopifyFullyManaged');

          const clientId = localStorage.getItem('oauth_client_id') || '';
          const clientSecret = localStorage.getItem('oauth_client_secret') || '';

          try {
            const stateData = JSON.parse(decodeURIComponent(state));
            await handleOAuthIntegration({
              code,
              platform: 'ShopifyFullyManaged',
              clientId,
              clientSecret,
              shop: stateData.shop || shop
            });
          } catch (e) {
            console.error('Error parsing state for Shopify Fully Managed:', e);
            await handleOAuthIntegration({
              code,
              platform: 'ShopifyFullyManaged',
              clientId,
              clientSecret,
              shop: shop
            });
          }

          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error("Failed to process OAuth callback. Please try again.");
      }
    };

    if (open) {
      processOAuthCallback();
    }
  }, [open, onOpenChange]);

  const handleOAuthIntegration = async (oauthData: { 
    code: string; 
    platform: string; 
    clientId: string; 
    clientSecret?: string; 
    shop?: string 
  }) => {
    setLoading(true);
    try {
      if (oauthData.platform === 'ShopifyFullyManaged') {
        const shop = oauthData.shop || localStorage.getItem('oauth_shop');
        const state = localStorage.getItem('oauth_state');
        const clientId = oauthData.clientId || localStorage.getItem('oauth_client_id') || '';
        const clientSecret = oauthData.clientSecret || localStorage.getItem('oauth_client_secret') || '';

        if (!shop) {
          throw new Error('Shop URL not found. Please try the authorization process again.');
        }

        if (!clientId || !clientSecret) {
          throw new Error('Missing Shopify app credentials. Please try the authorization process again.');
        }

        const { data, error } = await supabase.functions.invoke('shopify-managed-oauth-callback', {
          body: {
            code: oauthData.code,
            shop,
            state,
            clientId,
            clientSecret
          }
        });

        if (error) {
          throw new Error(error.message || 'Failed to complete Shopify integration');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to complete Shopify integration');
        }

        onIntegrationAdded(data.integration);
        toast.success("Successfully connected to Shopify Fully Managed");

        localStorage.removeItem('oauth_shop');
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_platform');
        localStorage.removeItem('oauth_client_id');
        localStorage.removeItem('oauth_client_secret');
        localStorage.removeItem('oauth_return_path');

        window.history.replaceState({}, document.title, window.location.pathname);
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error processing OAuth integration:', error);
      toast.error(error.message || "Failed to complete OAuth integration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async (credentials: { clientId: string; clientSecret: string; shop?: string }) => {
    if (!selectedPlatform) return;
    
    setLoading(true);
    try {
      const oauthUrl = await getOAuthUrl(selectedPlatform, credentials);
      if (!oauthUrl) {
        throw new Error('OAuth not supported for this platform');
      }

      if (selectedPlatform === 'ShopifyFullyManaged') {
        console.log('Redirecting to Shopify Fully Managed OAuth:', oauthUrl);
        localStorage.setItem('oauth_return_path', window.location.pathname);
        window.location.href = oauthUrl;
        return;
      }
    } catch (error: any) {
      console.error('Error starting OAuth flow:', error);
      toast.error(error.message || "Failed to start OAuth flow. Please check your credentials.");
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedPlatform) return;
    
    setLoading(true);
    try {
      if (isOAuthPlatform(selectedPlatform)) {
        setLoading(false);
        return;
      }

      if (selectedPlatform === 'WordPress') {
        if (!formData.client_id.trim() || !formData.client_secret.trim() || !formData.account_id.trim()) {
          toast.error("Please enter WordPress Site URL, Username, and Application Password.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('integrations-api', {
          body: {
            platform: selectedPlatform,
            client_id: formData.client_id.trim(),
            client_secret: formData.client_secret.trim(),
            account_id: formData.account_id.trim()
          }
        });

        if (error) {
          throw new Error(error.message || 'Failed to connect');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to connect. Please check your credentials.');
        }

        if (!data.integration) {
          throw new Error('No integration data returned from server');
        }

        onIntegrationAdded(data.integration);
        toast.success("Successfully connected to WordPress");
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error connecting integration:', error);
      toast.error(error.message || "Failed to connect. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedPlatform(null);
    setFormData({
      client_id: '',
      client_secret: '',
      account_id: '',
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Connect Platform</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {selectedPlatform === 'WordPress' && (
            <WordPressConfiguration
              formData={formData}
              loading={loading}
              onConnect={handleConnect}
              onInputChange={handleInputChange}
            />
          )}

          {selectedPlatform === 'ShopifyFullyManaged' && (
            <ShopifyFullyManagedConfiguration
              loading={loading}
              onConnect={handleOAuthConnect}
            />
          )}

          {!selectedPlatform && (
            <div className="py-4 space-y-4">
              <p className="text-gray-700">Select a platform to connect:</p>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedPlatform('WordPress')}
                  className="w-full p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <strong className="text-gray-900">WordPress (Self-Hosted)</strong>
                  <p className="text-sm text-gray-600 mt-1">Connect using Application Password</p>
                </button>
                <button
                  onClick={() => setSelectedPlatform('ShopifyFullyManaged')}
                  className="w-full p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <strong className="text-gray-900">Shopify Fully Managed</strong>
                  <p className="text-sm text-gray-600 mt-1">Connect using your own Shopify app credentials</p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
