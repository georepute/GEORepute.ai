'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Copy, Check, AlertCircle, Trash2, RefreshCw, ExternalLink, X, Plus } from 'lucide-react';

interface GSCIntegrationData {
  integration_id?: string;
  domain_url?: string;
  site_url?: string;
  verification_method?: 'DNS_TXT' | 'DNS_CNAME' | 'FILE' | 'META' | 'ANALYTICS' | 'TAG_MANAGER';
  verification_token?: string;
  verification_status?: 'pending' | 'verified' | 'failed';
  permission_level?: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser';
  last_synced_at?: string;
  verified_at?: string;
  error?: string;
  failed_at?: string;
  [key: string]: any;
}

interface Domain {
  id: string;
  domain: string;
  status: string;
  user_id?: string;
  organization_id?: string;
  gsc_integration?: GSCIntegrationData | null;
  created_at: string;
  updated_at: string;
  // Computed properties for backward compatibility
  domain_url?: string;
  site_url?: string;
  verification_status?: 'pending' | 'verified' | 'failed';
  verification_token?: string;
  verification_method?: string;
  last_synced_at?: string;
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
  const [loading, setLoading] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [modalDomain, setModalDomain] = useState<Domain | null>(null);
  const [dnsCheckResult, setDnsCheckResult] = useState<any>(null);
  const [checkingDns, setCheckingDns] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugging, setDebugging] = useState(false);

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
      const errorMsg = decodeURIComponent(params.get('gsc_error') || 'Failed to connect to Google Search Console');
      toast.error(errorMsg, { duration: 6000 });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkConnection = async () => {
    try {
      setCheckingConnection(true);
      const response = await fetch('/api/integrations/google-search-console/status');
      const data = await response.json();
      
      if (data.connected) {
        setIsConnected(true);
        setIntegration(data.integration);
      }
    } catch (error) {
      console.error('Check connection error:', error);
    } finally {
      setCheckingConnection(false);
    }
  };

  const loadDomains = async () => {
    try {
      const response = await fetch('/api/integrations/google-search-console/domains');
      const data = await response.json();
      if (data.success) {
        // Map domains to include backward compatibility fields
        const mappedDomains = (data.domains || []).map((domain: any) => ({
          ...domain,
          // Extract GSC data for easier access
          domain_url: domain.gsc_integration?.domain_url || domain.domain,
          site_url: domain.gsc_integration?.site_url || `https://${domain.domain}`,
          verification_status: domain.gsc_integration?.verification_status || 'pending',
          verification_token: domain.gsc_integration?.verification_token,
          verification_method: domain.gsc_integration?.verification_method || 'DNS_TXT',
          last_synced_at: domain.gsc_integration?.last_synced_at,
        }));
        setDomains(mappedDomains);
      }
    } catch (error) {
      console.error('Load domains error:', error);
    }
  };

  const connectGSC = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google-search-console/auth-url');
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
    if (!confirm('Are you sure you want to disconnect Google Search Console? Your domains and analytics data will be preserved.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/integrations/google-search-console/status', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Disconnected successfully. Your data has been preserved.');
        setIsConnected(false);
        setIntegration(null);
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

  const addDomainToGSC = async (domainId: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/integrations/google-search-console/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Domain added to GSC! Please add the TXT record to verify.');
        await loadDomains();
        
        // Open modal with the newly added domain
        setModalDomain(data.domain);
        setShowTokenModal(true);
      } else {
        toast.error(data.error || 'Failed to add domain to GSC');
      }
    } catch (error) {
      console.error('Add domain to GSC error:', error);
      toast.error('Failed to add domain to GSC');
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
        setShowTokenModal(false);
        setModalDomain(null);
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
    if (!confirm('Are you sure you want to remove GSC integration from this domain? The domain will remain in your domains list.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/google-search-console/domains?domainId=${domainId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('GSC integration removed successfully');
        loadDomains();
      } else {
        toast.error('Failed to remove GSC integration');
      }
    } catch (error) {
      console.error('Delete GSC integration error:', error);
      toast.error('Failed to remove GSC integration');
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

  const checkDns = async (domainId: string) => {
    setCheckingDns(true);
    setDnsCheckResult(null);
    try {
      const response = await fetch('/api/integrations/google-search-console/domains/check-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });

      const data = await response.json();

      if (response.ok) {
        setDnsCheckResult(data);
        if (data.tokenFound) {
          toast.success('✅ Verification token found in DNS!');
        } else {
          toast.error('❌ Verification token not found in DNS yet');
        }
      } else {
        toast.error(data.error || 'Failed to check DNS');
      }
    } catch (error) {
      console.error('Check DNS error:', error);
      toast.error('Failed to check DNS');
    } finally {
      setCheckingDns(false);
    }
  };

  const debugVerification = async (domainId: string) => {
    setDebugging(true);
    setDebugResult(null);
    try {
      const response = await fetch('/api/integrations/google-search-console/domains/debug-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });

      const data = await response.json();

      if (response.ok) {
        setDebugResult(data.debug);
        console.log('Debug results:', data);
        toast.success('Debug complete - check the results below');
      } else {
        toast.error(data.error || 'Failed to debug verification');
      }
    } catch (error) {
      console.error('Debug verification error:', error);
      toast.error('Failed to debug verification');
    } finally {
      setDebugging(false);
    }
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

  // Show loading state while checking connection
  if (checkingConnection) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Search Console</h1>
              <p className="text-gray-600">
                Connect your Google Search Console account to track your website's search performance.
              </p>
            </div>
            <a
              href="/dashboard/domains"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add Domain
            </a>
          </div>

          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Checking connection status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Search Console</h1>
            <p className="text-gray-600">
              Connect your Google Search Console account to track your website's search performance.
            </p>
          </div>
          <a
            href="/dashboard/domains"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Add Domain
          </a>
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
              
              {/* Troubleshooting Info */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Getting "Error 403: access_denied"?</p>
                    <p className="text-blue-700 mb-2">
                      If you see this error, you need to add your email as a Test User in Google Cloud Console:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700 ml-2">
                      <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">Google Cloud Console</a></li>
                      <li>Navigate to: APIs & Services → OAuth consent screen</li>
                      <li>Scroll to "Test users" section and click "Add Users"</li>
                      <li>Add your email address and save</li>
                      <li>Try connecting again after 1-2 minutes</li>
                    </ol>
                    <a 
                      href="https://github.com/yourusername/georepute/blob/main/docs/QUICK_FIX_403_ERROR.md" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium mt-2"
                    >
                      View detailed guide <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
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

            {/* Domains List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Domains</h2>
              <p className="text-sm text-gray-600 mb-4">
                Manage your domains and add them to Google Search Console for tracking.
              </p>
              
              {domains.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExternalLink className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">No domains found</p>
                  <p className="text-sm text-gray-400">Add domains from the Domains page first, then connect them to GSC here</p>
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
                            <h3 className="font-semibold text-gray-900 text-lg">{domain.domain_url || domain.domain}</h3>
                            {domain.verification_status && (
                              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(domain.verification_status)}`}>
                                {getStatusIcon(domain.verification_status)}
                                {domain.verification_status}
                              </span>
                            )}
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
                          {!domain.gsc_integration ? (
                            // Show "Add to GSC" button for domains without GSC integration
                            <button
                              onClick={() => addDomainToGSC(domain.id)}
                              disabled={loading}
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Add to GSC
                            </button>
                          ) : (
                            <>
                              {(domain.verification_status === 'pending' || domain.verification_status === 'failed') && (
                                <>
                                  <button
                                    onClick={() => {
                                      setModalDomain(domain);
                                      setShowTokenModal(true);
                                    }}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                      domain.verification_status === 'failed'
                                        ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
                                        : 'text-yellow-700 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                                    }`}
                                  >
                                    Show Token
                                  </button>
                                  <button
                                    onClick={() => verifyDomain(domain.id)}
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    {domain.verification_status === 'failed' ? 'Retry Verification' : 'Verify'}
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
                            </>
                          )}
                          
                          {domain.gsc_integration && (
                            <button
                              onClick={() => deleteDomain(domain.id)}
                              disabled={loading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Remove GSC integration"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
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

      {/* Token Modal */}
      {showTokenModal && modalDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Domain Verification Token</h2>
                <p className="text-sm text-gray-500 mt-1">{modalDomain.domain_url}</p>
              </div>
              <button
                onClick={() => {
                  setShowTokenModal(false);
                  setModalDomain(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {modalDomain.verification_status === 'failed' && modalDomain.metadata?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Verification Failed</h3>
                      <p className="text-sm text-red-800 mb-2">
                        {modalDomain.metadata.error}
                      </p>
                      <p className="text-sm text-red-700">
                        Please ensure you've added the verification token correctly and wait a few minutes for DNS propagation before retrying.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-1">Verification Required</h3>
                    <p className="text-sm text-yellow-800">
                      Add this TXT record to your DNS settings to verify domain ownership. Changes may take a few minutes to propagate.
                    </p>
                  </div>
                </div>
              </div>

              {/* DNS Record Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Record Type</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="TXT"
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('TXT');
                        toast.success('Copied to clipboard');
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name / Host</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="@"
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('@');
                        toast.success('Copied to clipboard');
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Use @ or leave empty, or use your domain name</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">TTL (Time To Live)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="3600"
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('3600');
                        toast.success('Copied to clipboard');
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">1 hour (can be adjusted based on your DNS provider)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Value / Content</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={modalDomain.verification_token || ''}
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm break-all"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(modalDomain.verification_token || '');
                        toast.success('Token copied to clipboard');
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">The verification token provided by Google Search Console</p>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">How to add TXT record:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Log in to your domain registrar or DNS provider</li>
                  <li>Navigate to DNS management / DNS records section</li>
                  <li>Add a new TXT record with the values shown above</li>
                  <li>Save the changes and wait for DNS propagation (usually 5-30 minutes)</li>
                  <li>Come back here and click the "Verify Domain" button</li>
                </ol>
              </div>

              {/* DNS Check Results */}
              {dnsCheckResult && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  dnsCheckResult.tokenFound 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <h4 className={`font-semibold mb-2 text-sm ${
                    dnsCheckResult.tokenFound ? 'text-green-900' : 'text-orange-900'
                  }`}>
                    DNS Check Results
                  </h4>
                  <div className={`text-sm space-y-2 ${
                    dnsCheckResult.tokenFound ? 'text-green-800' : 'text-orange-800'
                  }`}>
                    {dnsCheckResult.advice?.map((tip: string, index: number) => (
                      <p key={index}>{tip}</p>
                    ))}
                    
                    {dnsCheckResult.allTxtRecords?.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium mb-1">Found TXT Records:</p>
                        <div className="bg-white bg-opacity-50 rounded p-2 font-mono text-xs space-y-1">
                          {dnsCheckResult.allTxtRecords.map((record: string, index: number) => (
                            <div key={index} className="break-all">• {record}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {dnsCheckResult.dnsError && (
                      <p className="text-red-700 font-medium mt-2">
                        DNS Error: {dnsCheckResult.dnsError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowTokenModal(false);
                  setModalDomain(null);
                  setDnsCheckResult(null);
                  setDebugResult(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  verifyDomain(modalDomain.id);
                  setShowTokenModal(false);
                  setModalDomain(null);
                  setDnsCheckResult(null);
                  setDebugResult(null);
                }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Verify Domain Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

