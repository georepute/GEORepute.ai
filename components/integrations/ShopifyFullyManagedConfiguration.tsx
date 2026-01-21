import { useState } from "react";
import { Info } from "lucide-react";

interface ShopifyFullyManagedConfigurationProps {
  loading: boolean;
  onConnect: (credentials: { clientId: string; clientSecret: string; shop: string }) => void;
}

export const ShopifyFullyManagedConfiguration = ({ 
  loading, 
  onConnect 
}: ShopifyFullyManagedConfigurationProps) => {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [shopUrl, setShopUrl] = useState("");
  const [errors, setErrors] = useState<{ clientId?: string; clientSecret?: string; shopUrl?: string }>({});

  const validateForm = () => {
    const newErrors: { clientId?: string; clientSecret?: string; shopUrl?: string } = {};
    
    if (!shopUrl.trim()) {
      newErrors.shopUrl = "Shopify store URL is required";
    } else if (!shopUrl.trim().endsWith('.myshopify.com')) {
      newErrors.shopUrl = "Must be a valid myshopify.com domain";
    }
    if (!clientId.trim()) {
      newErrors.clientId = "Client ID is required";
    }
    if (!clientSecret.trim()) {
      newErrors.clientSecret = "Client Secret is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConnect = () => {
    if (validateForm()) {
      onConnect({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        shop: shopUrl.trim()
      });
    }
  };

  const handleOpenGuide = () => {
    if (typeof window === "undefined") return;
    const guideWindow = window.open("/dashboard/integration-guides/shopify-fully-managed", "_blank");
    guideWindow?.focus();
  };

  return (
    <div className="py-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-green-600 text-white rounded flex items-center justify-center font-bold">
          S
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Connect to Shopify Fully Managed
        </h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-gray-700">
          To connect with Shopify using your own app credentials, you'll need to create a custom app in your Shopify store.
        </p>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="font-medium text-blue-900">Connect with Your Shopify App Credentials:</p>
              <ol className="list-decimal list-inside text-sm space-y-1 ml-2 text-blue-800">
                <li>Enter the Shopify store URL (e.g., yourstore.myshopify.com)</li>
                <li>Provide the Client ID and Client Secret from your Shopify app</li>
                <li>Click 'Connect to Shopify' to install your app in this store</li>
                <li>Once approved, we'll use the generated access token to publish on your behalf</li>
              </ol>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  Complete Setup Guide
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="shopUrl" className="block text-sm font-medium text-gray-700">
              Shopify Store URL
            </label>
            <input
              id="shopUrl"
              type="text"
              value={shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
              placeholder="yourstore.myshopify.com"
              className={`w-full px-4 py-3 border rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none ${
                errors.shopUrl ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.shopUrl && (
              <p className="text-sm text-red-500">{errors.shopUrl}</p>
            )}
            <p className="text-xs text-gray-500">
              Enter the Shopify store where you've created your custom app.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
              Client ID
            </label>
            <input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your Shopify App Client ID"
              className={`w-full px-4 py-3 border rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none ${
                errors.clientId ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId}</p>
            )}
            <p className="text-xs text-gray-500">
              From Shopify Admin → Apps and sales channels → Develop apps → Your app.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700">
              Client Secret
            </label>
            <input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Your Shopify App Client Secret"
              className={`w-full px-4 py-3 border rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none ${
                errors.clientSecret ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.clientSecret && (
              <p className="text-sm text-red-500">{errors.clientSecret}</p>
            )}
            <p className="text-xs text-gray-500">
              We'll use this to exchange the OAuth code for an access token.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={handleConnect} 
            disabled={loading || !shopUrl.trim() || !clientId.trim() || !clientSecret.trim()}
            className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connecting..." : "Connect to Shopify"}
          </button>
        </div>
      </div>
    </div>
  );
};
