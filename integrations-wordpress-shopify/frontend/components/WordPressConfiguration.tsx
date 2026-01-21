import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlatformIcons } from "../PlatformIcons";

interface WordPressConfigurationProps {
  formData: {
    client_id: string;
    client_secret: string;
    account_id: string;
  };
  loading: boolean;
  onConnect: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WordPressConfiguration = ({
  formData,
  loading,
  onConnect,
  onInputChange
}: WordPressConfigurationProps) => {
  const handleOpenGuide = () => {
    if (typeof window === "undefined") return;
    const guideWindow = window.open("/dashboard/integration-guides/wordpress", "_blank");
    guideWindow?.focus();
  };

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8">
          <PlatformIcons platform="WordPress" className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium">
          Connect to WordPress (Self-Hosted)
        </h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account_id">WordPress Site URL</Label>
          <Input 
            id="account_id" 
            name="account_id" 
            value={formData.account_id} 
            onChange={onInputChange}
            placeholder="https://yoursite.com"
          />
          <p className="text-xs text-muted-foreground">
            The URL of your WordPress site (e.g., https://example.com)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client_secret">WordPress Username</Label>
          <Input 
            id="client_secret" 
            name="client_secret" 
            value={formData.client_secret} 
            onChange={onInputChange}
            placeholder="admin"
          />
          <p className="text-xs text-muted-foreground">
            The username of an administrator account
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client_id">Application Password</Label>
          <Input 
            id="client_id" 
            name="client_id" 
            value={formData.client_id} 
            onChange={onInputChange}
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            type="password"
          />
          <p className="text-xs text-muted-foreground">
            Generate an Application Password in WordPress admin → Users → Your Profile → Application Passwords
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={handleOpenGuide}>
            View Setup Guide
          </Button>
          <Button 
            onClick={onConnect} 
            disabled={loading || !formData.client_id.trim() || !formData.client_secret.trim() || !formData.account_id.trim()}
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </div>
    </div>
  );
};
