'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Copy, Check, AlertCircle, Trash2, RefreshCw, ExternalLink } from 'lucide-react';

interface Domain {
  id: string;
  domain_url: string;
  site_url: string;
  verification_status: 'pending' | 'verified' | 'failed';
  verification_token?: string;
  verification_method?: string;
  last_synced_at?: string;
  created_at: string;
  metadata?: any;
}

interface Integration {
  id: string;
  status: string;
  connected_at?: string;
  expires_at?: string;
  is_expired?: boolean;
}

export default function GoogleSearchConsolePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    checkConnection();
    loadDomains();
    
    // Check for success/error params in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('gsc_connected') === 'true') {
      toast.success('Google Search Console connected successfully!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('gsc_error')) {
      toast.error('Failed to connect to Google Search Console');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/integrations/google-search-console/status');
      const data = await response.json();
      
      if (data.connected) {
        setIsConnected(true);
        setIntegration(data.integration);
      }
    } catch (error) {
      console.error('Check connection error:', error);
    }
  };

  const loadDomains = async () => {
    try {
      const response = await fetch('/api/integrations/google-search-console/domains');
      const data = await response.json();
      if (data.success) {
        setDomains(data.domains || []);
      }
    } catch (error) {
      console.error('Load domains error:', error);
    }
  };

  const connectGSC = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google-search-console/auth');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to connect to Google Search Console');
    } finally {
      setLoading(false);
    }
  };

  const disconnectGSC = async () => {
    if (!confirm('Are you sure you want to disconnect Google Search Console? This will remove all your domains and analytics data.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google-search-console/status', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Disconnected successfully');
        setIsConnected(false);
        setIntegration(null);
        setDomains([]);
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setLoading(true);
    setVerificationToken('');
    setSelectedDomainId(null);
    
    try {
      const response = await fetch('/api/integrations/google-search-console/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainUrl: newDomain.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationToken(data.verificationToken);
        setSelectedDomainId(data.domain.id);
        toast.success('Domain added! Please add the TXT record to verify.');
        loadDomains();
        setNewDomain('');
      } else {
        toast.error(data.error || 'Failed to add domain');
      }
    } catch (error) {
      console.error('Add domain error:', error);
      toast.error('Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  const verifyDomain = async (domainId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google-search-console/domains/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Domain verified successfully!');
        loadDomains();
        setVerificationToken('');
        setSelectedDomainId(null);
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verify domain error:', error);
      toast.error('Failed to verify domain');
    } finally {
      setLoading(false);
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain? All analytics data will be deleted.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/google-search-console/domains?domainId=${domainId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Domain removed successfully');
        loadDomains();
      } else {
        toast.error('Failed to remove domain');
      }
    } catch (error) {
      console.error('Delete domain error:', error);
      toast.error('Failed to remove domain');
    } finally {
      setLoading(false);
    }
  };

  const syncAnalytics = async (domainId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google-search-console/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          startDate: getDateDaysAgo(30),
          endDate: getDateDaysAgo(0),
          dimensions: ['date'],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Analytics synced successfully');
        loadDomains();
      } else {
        toast.error(data.error || 'Failed to sync analytics');
      }
    } catch (error) {
      console.error('Sync analytics error:', error);
      toast.error('Failed to sync analytics');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <Check className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Search Console</h1>
          <p className="text-gray-600">
            Connect your Google Search Console account to track your website's search performance.
          </p>
        </div>

        {/* Connection Status */}
        {!isConnected ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Connect Your Account</h2>
                <p className="text-gray-600">
                  Authorize access to your Google Search Console data to get started with tracking your website's search performance.
                </p>
              </div>
              <button
                onClick={connectGSC}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Connecting...' : 'Connect Google Search Console'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Connected Status Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Connected to Google Search Console</p>
                  {integration?.connected_at && (
                    <p className="text-sm text-green-700">
                      Connected on {new Date(integration.connected_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={disconnectGSC}
                disabled={loading}
                className="text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>

            {/* Add Domain Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Domain</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                />
                <button
                  onClick={addDomain}
                  disabled={loading || !newDomain.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Adding...' : 'Add Domain'}
                </button>
              </div>

              {verificationToken && selectedDomainId && (
                <div className="mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-2">Verification Required</h3>
                      <p className="text-sm text-yellow-800 mb-4">
                        Add this TXT record to your DNS settings to verify domain ownership. Changes may take a few minutes to propagate.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <p className="text-gray-900 mt-1">TXT</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Name:</span>
                        <p className="text-gray-900 mt-1">@ (or your domain)</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">TTL:</span>
                        <p className="text-gray-900 mt-1">3600</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Value:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 block p-2 bg-gray-50 rounded text-sm break-all font-mono text-gray-900">
                          {verificationToken}
                        </code>
                        <button
                          onClick={() => copyToClipboard(verificationToken)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedToken ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => verifyDomain(selectedDomainId)}
                    disabled={loading}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Verifying...' : 'Verify Domain'}
                  </button>
                </div>
              )}
            </div>

            {/* Domains List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Domains</h2>
              
              {domains.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExternalLink className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">No domains added yet</p>
                  <p className="text-sm text-gray-400">Add your first domain above to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{domain.domain_url}</h3>
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(domain.verification_status)}`}>
                              {getStatusIcon(domain.verification_status)}
                              {domain.verification_status}
                            </span>
                          </div>
                          
                          {domain.last_synced_at && (
                            <p className="text-sm text-gray-500">
                              Last synced: {new Date(domain.last_synced_at).toLocaleString()}
                            </p>
                          )}
                          
                          {domain.verification_status === 'failed' && domain.metadata?.error && (
                            <p className="text-sm text-red-600 mt-2">
                              Error: {domain.metadata.error}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {domain.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setVerificationToken(domain.verification_token || '');
                                  setSelectedDomainId(domain.id);
                                }}
                                className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                              >
                                Show Token
                              </button>
                              <button
                                onClick={() => verifyDomain(domain.id)}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                Verify
                              </button>
                            </>
                          )}
                          
                          {domain.verification_status === 'verified' && (
                            <button
                              onClick={() => syncAnalytics(domain.id)}
                              disabled={loading}
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                              Sync Data
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteDomain(domain.id)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove domain"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

