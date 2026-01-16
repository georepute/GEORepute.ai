import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/Layout";

interface KeyStatus {
  isValid: boolean;
  lastUpdated: Date | null;
}

const platformInfo = {
  openai: { label: "OpenAI", placeholder: "sk-...", description: "ChatGPT for brand research" },
  claude: { label: "Claude", placeholder: "sk-ant-...", description: "Anthropic Claude for analysis" },
  gemini: { label: "Gemini", placeholder: "AIza...", description: "Google Gemini for insights" },
  perplexity: { label: "Perplexity", placeholder: "pplx-...", description: "Perplexity for web search" },
  grok: { label: "Grok (xAI)", placeholder: "xai-...", description: "xAI Grok for AI analysis" },
};

const BrandAnalysisApiKeys = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [keys, setKeys] = useState<Record<string, string>>({
    openai: "",
    claude: "",
    gemini: "",
    perplexity: "",
    grok: "",
  });
  const [statuses, setStatuses] = useState<Record<string, KeyStatus>>({
    openai: { isValid: false, lastUpdated: null },
    claude: { isValid: false, lastUpdated: null },
    gemini: { isValid: false, lastUpdated: null },
    perplexity: { isValid: false, lastUpdated: null },
    grok: { isValid: false, lastUpdated: null },
  });

  useEffect(() => {
    loadApiKeyStatuses();
  }, []);

  const loadApiKeyStatuses = async () => {
    try {
      const platformTypes = Object.keys(platformInfo);
      const statusPromises = platformTypes.map(async (platform) => {
        const { data, error } = await supabase.functions.invoke('api-key-management', {
          body: { action: 'get_status', key_type: platform }
        });
        
        if (error) {
          console.error(`Error loading ${platform} status:`, error);
          return [platform, { isValid: false, lastUpdated: null }];
        }
        
        return [platform, {
          isValid: data?.valid || false,
          lastUpdated: data?.last_validated_at ? new Date(data.last_validated_at) : null,
        }];
      });

      const results = await Promise.all(statusPromises);
      const newStatuses = Object.fromEntries(results);
      setStatuses(newStatuses);
      
      // Mask existing keys
      const newKeys = { ...keys };
      Object.keys(newStatuses).forEach((platform) => {
        if (newStatuses[platform].isValid) {
          newKeys[platform] = "•".repeat(20);
        }
      });
      setKeys(newKeys);
    } catch (error) {
      console.error("Error loading API key statuses:", error);
      toast({
        title: "Error",
        description: "Failed to load API key statuses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateKey = async (platform: string) => {
    const key = keys[platform];
    
    if (!key || key === "•".repeat(20)) {
      toast({
        title: "Error",
        description: `Please enter a valid ${platformInfo[platform].label} API key`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('api-key-management', {
        body: { 
          action: 'update_key', 
          key_type: platform,
          api_key: key
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to update API key');
      }

      // Reload status
      const { data: statusData } = await supabase.functions.invoke('api-key-management', {
        body: { action: 'get_status', key_type: platform }
      });

      setStatuses(prev => ({
        ...prev,
        [platform]: {
          isValid: statusData?.valid || false,
          lastUpdated: statusData?.last_validated_at ? new Date(statusData.last_validated_at) : new Date(),
        }
      }));

      toast({
        title: "Success",
        description: `${platformInfo[platform].label} API key updated successfully`,
      });

      // Mask the key
      setKeys(prev => ({ ...prev, [platform]: "•".repeat(20) }));
    } catch (error) {
      console.error(`Error updating ${platform} key:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to update ${platformInfo[platform].label} API key`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Brand Visibility API Keys">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Brand Visibility API Keys">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Brand Visibility Platform API Keys</CardTitle>
            <CardDescription>
              Configure API keys for the 5 AI platforms used in brand visibility research
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(platformInfo).map(([platform, info]) => (
                <div key={platform} className="space-y-3 pb-6 border-b last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{info.label}</h3>
                      <Badge variant={statuses[platform]?.isValid ? "default" : "secondary"}>
                        {statuses[platform]?.isValid ? "Active" : "Not Set"}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{info.description}</p>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`${platform}-key`} className="sr-only">
                        {info.label} API Key
                      </Label>
                      <Input
                        id={`${platform}-key`}
                        type="password"
                        value={keys[platform]}
                        onChange={(e) => setKeys(prev => ({ ...prev, [platform]: e.target.value }))}
                        placeholder={info.placeholder}
                      />
                    </div>
                    <Button onClick={() => handleUpdateKey(platform)} variant="secondary">
                      Save
                    </Button>
                  </div>
                  
                  {statuses[platform]?.lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      Last updated: {statuses[platform].lastUpdated.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">How to get API keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>OpenAI:</strong> <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a></p>
            <p><strong>Claude:</strong> <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.anthropic.com/settings/keys</a></p>
            <p><strong>Gemini:</strong> <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aistudio.google.com/app/apikey</a></p>
            <p><strong>Perplexity:</strong> <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">perplexity.ai/settings/api</a></p>
            <p><strong>Grok (xAI):</strong> <a href="https://console.x.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.x.ai</a></p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default BrandAnalysisApiKeys;
