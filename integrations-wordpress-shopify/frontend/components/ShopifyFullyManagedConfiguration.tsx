import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlatformIcons } from "../PlatformIcons";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
        <div className="w-8 h-8">
          <PlatformIcons platform="ShopifyFullyManaged" className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium">
          Connect to Shopify Fully Managed
        </h3>
      </div>
      
      <div className="space-y-4">
        <p>
          To connect with Shopify using your own app credentials, you'll need to create a custom app in your Shopify store.
        </p>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Connect with Your Shopify App Credentials:</p>
              <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                <li>Enter the Shopify store URL (e.g., yourstore.myshopify.com)</li>
                <li>Provide the Client ID and Client Secret from your Shopify app</li>
                <li>Click 'Connect to Shopify' to install your app in this store</li>
                <li>Once approved, we'll use the generated access token to publish on your behalf</li>
              </ol>
              <div>
                <Button variant="outline" size="sm" onClick={handleOpenGuide}>
                  Complete Setup Guide
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopUrl">Shopify Store URL</Label>
            <Input
              id="shopUrl"
              value={shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
              placeholder="yourstore.myshopify.com"
              className={errors.shopUrl ? "border-red-500" : ""}
            />
            {errors.shopUrl && (
              <p className="text-sm text-red-500">{errors.shopUrl}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter the Shopify store where you've created your custom app.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your Shopify App Client ID"
              className={errors.clientId ? "border-red-500" : ""}
            />
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId}</p>
            )}
            <p className="text-xs text-muted-foreground">
              From Shopify Admin → Apps and sales channels → Develop apps → Your app.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Your Shopify App Client Secret"
              className={errors.clientSecret ? "border-red-500" : ""}
            />
            {errors.clientSecret && (
              <p className="text-sm text-red-500">{errors.clientSecret}</p>
            )}
            <p className="text-xs text-muted-foreground">
              We'll use this to exchange the OAuth code for an access token.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleConnect} 
            disabled={loading || !shopUrl.trim() || !clientId.trim() || !clientSecret.trim()}
          >
            {loading ? "Connecting..." : "Connect to Shopify"}
          </Button>
        </div>
      </div>
    </div>
  );
};
