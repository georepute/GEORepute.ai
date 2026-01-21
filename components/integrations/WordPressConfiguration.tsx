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
        <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold">
          WP
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Connect to WordPress (Self-Hosted)
        </h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="account_id" className="block text-sm font-medium text-gray-700">
            WordPress Site URL
          </label>
          <input 
            id="account_id" 
            name="account_id" 
            type="text"
            value={formData.account_id} 
            onChange={onInputChange}
            placeholder="https://yoursite.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
          <p className="text-xs text-gray-500">
            The URL of your WordPress site (e.g., https://example.com)
          </p>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="client_secret" className="block text-sm font-medium text-gray-700">
            WordPress Username
          </label>
          <input 
            id="client_secret" 
            name="client_secret" 
            type="text"
            value={formData.client_secret} 
            onChange={onInputChange}
            placeholder="admin"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
          <p className="text-xs text-gray-500">
            The username of an administrator account
          </p>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
            Application Password
          </label>
          <input 
            id="client_id" 
            name="client_id" 
            type="password"
            value={formData.client_id} 
            onChange={onInputChange}
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
          <p className="text-xs text-gray-500">
            Generate an Application Password in WordPress admin → Users → Your Profile → Application Passwords
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleOpenGuide}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            View Setup Guide
          </button>
          <button 
            type="button"
            onClick={onConnect} 
            disabled={loading || !formData.client_id.trim() || !formData.client_secret.trim() || !formData.account_id.trim()}
            className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
};
