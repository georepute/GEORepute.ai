export interface IntegrationCredential {
  id: string;
  user_id: string;
  created_by_user_id: string;
  platform_id?: string;
  platform: string;
  client_id?: string;
  client_secret?: string;
  account_id?: string;
  account_name?: string;
  status: string;
  settings?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}
