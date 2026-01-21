"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { IntegrationCredential } from "@/types/integrations";
import { ConnectIntegrationDialog } from "@/components/integrations/ConnectIntegrationDialog";
import { Plus, ExternalLink, Loader, XCircle, FileText, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

export default function BlogPage() {
  const { isRtl, t } = useLanguage();
  const [wordPressIntegrations, setWordPressIntegrations] = useState<IntegrationCredential[]>([]);
  const [shopifyIntegrations, setShopifyIntegrations] = useState<IntegrationCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('integration_credentials')
        .select('*')
        .in('platform', ['WordPress', 'ShopifyFullyManaged'])
        .eq('created_by_user_id', user.id)
        .eq('status', 'connected')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading integrations:', error);
        return;
      }

      const wp = (data || []).filter(i => i.platform === 'WordPress');
      const shopify = (data || []).filter(i => i.platform === 'ShopifyFullyManaged');

      setWordPressIntegrations(wp);
      setShopifyIntegrations(shopify);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationAdded = (integration: IntegrationCredential) => {
    if (integration.platform === 'WordPress') {
      setWordPressIntegrations(prev => [integration, ...prev]);
    } else if (integration.platform === 'ShopifyFullyManaged') {
      setShopifyIntegrations(prev => [integration, ...prev]);
    }
    setDialogOpen(false);
  };

  const handlePublish = async (integration: IntegrationCredential, content: { title: string; content: string }) => {
    setPublishing(integration.id);
    try {
      if (integration.platform === 'WordPress') {
        await publishToWordPress(integration, content);
      } else if (integration.platform === 'ShopifyFullyManaged') {
        await publishToShopify(integration, content);
      }
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || "Failed to publish");
    } finally {
      setPublishing(null);
    }
  };

  const publishToWordPress = async (integration: IntegrationCredential, content: { title: string; content: string }) => {
    try {
      // Decrypt WordPress password
      const { data: decryptedData, error: decryptError } = await supabase.functions.invoke('integrations-api', {
        method: 'GET',
        body: { integrationId: integration.id }
      });

      if (decryptError) {
        throw new Error('Failed to get WordPress credentials');
      }

      // Get decrypted password from test connection
      const siteUrl = integration.account_id;
      const username = integration.client_secret;
      
      // We need to decrypt the password - for now, call the publish API
      const response = await fetch('/api/publish/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: integration.id,
          title: content.title,
          content: content.content,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish to WordPress');
      }

      toast.success(`Published to WordPress: ${data.url || 'Success'}`);
    } catch (error: any) {
      throw error;
    }
  };

  const publishToShopify = async (integration: IntegrationCredential, content: { title: string; content: string }) => {
    try {
      const response = await fetch('/api/publish/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: integration.id,
          title: content.title,
          content: content.content,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish to Shopify');
      }

      toast.success(`Published to Shopify: ${data.url || 'Success'}`);
    } catch (error: any) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog Publishing</h1>
        <p className="text-gray-600">Publish your content to WordPress and Shopify blogs</p>
      </div>

      {/* WordPress Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-lg">
              WP
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">WordPress</h2>
              <p className="text-sm text-gray-600">
                {wordPressIntegrations.length} site{wordPressIntegrations.length !== 1 ? 's' : ''} connected
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedPlatform('WordPress');
              setDialogOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Connect WordPress
          </button>
        </div>

        {wordPressIntegrations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No WordPress sites connected</p>
            <button
              onClick={() => {
                setSelectedPlatform('WordPress');
                setDialogOpen(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect Your First WordPress Site
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {wordPressIntegrations.map((integration) => (
              <BlogPublishCard
                key={integration.id}
                integration={integration}
                onPublish={handlePublish}
                publishing={publishing === integration.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shopify Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 text-white rounded flex items-center justify-center font-bold text-lg">
              S
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Shopify</h2>
              <p className="text-sm text-gray-600">
                {shopifyIntegrations.length} store{shopifyIntegrations.length !== 1 ? 's' : ''} connected
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedPlatform('ShopifyFullyManaged');
              setDialogOpen(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Connect Shopify
          </button>
        </div>

        {shopifyIntegrations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No Shopify stores connected</p>
            <button
              onClick={() => {
                setSelectedPlatform('ShopifyFullyManaged');
                setDialogOpen(true);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Connect Your First Shopify Store
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {shopifyIntegrations.map((integration) => (
              <BlogPublishCard
                key={integration.id}
                integration={integration}
                onPublish={handlePublish}
                publishing={publishing === integration.id}
              />
            ))}
          </div>
        )}
      </div>

      <ConnectIntegrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onIntegrationAdded={handleIntegrationAdded}
        preselectedPlatform={selectedPlatform}
      />
    </div>
  );
}

interface BlogPublishCardProps {
  integration: IntegrationCredential;
  onPublish: (integration: IntegrationCredential, content: { title: string; content: string }) => Promise<void>;
  publishing: boolean;
}

function BlogPublishCard({ integration, onPublish, publishing }: BlogPublishCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both title and content");
      return;
    }
    await onPublish(integration, { title: title.trim(), content: content.trim() });
    setTitle("");
    setContent("");
    setShowForm(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{integration.account_name || integration.account_id}</h3>
          <p className="text-sm text-gray-600">{integration.account_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
            Connected
          </span>
          {integration.account_id && (
            <a
              href={`https://${integration.account_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          disabled={publishing}
          className="w-full px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
        >
          Publish New Blog Post
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter blog post title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter blog post content (HTML or Markdown supported)"
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-sm"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={publishing || !title.trim() || !content.trim()}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {publishing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setContent("");
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
