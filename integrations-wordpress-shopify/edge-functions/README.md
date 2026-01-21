# Edge Functions Documentation

## Shopify Fully Managed OAuth Callback

**File**: `shopify-managed-oauth-callback/index.ts`

### Purpose
Handles the OAuth callback from Shopify after user authorization. Exchanges the authorization code for an access token and stores the integration.

### Endpoint
`POST /functions/v1/shopify-managed-oauth-callback`

### Request Body
```json
{
  "code": "authorization_code_from_shopify",
  "shop": "yourstore.myshopify.com",
  "state": "encoded_state_string",
  "clientId": "your_shopify_app_client_id",
  "clientSecret": "your_shopify_app_client_secret"
}
```

### Response
```json
{
  "success": true,
  "integration": {
    "id": "integration_id",
    "platform": "ShopifyFullyManaged",
    "account_id": "yourstore.myshopify.com",
    "status": "connected"
  },
  "message": "Successfully connected to Shopify Fully Managed"
}
```

### Environment Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

---

## Integrations API

**File**: `integrations-api/index.ts`

### Purpose
Main API for managing integrations. Handles creation, updates, deletion, and connection testing for WordPress and Shopify Fully Managed.

### Endpoints

#### Create Integration
`POST /functions/v1/integrations-api`

**Request Body (WordPress)**:
```json
{
  "platform": "WordPress",
  "client_id": "application_password",
  "client_secret": "wordpress_username",
  "account_id": "https://yoursite.com"
}
```

**Request Body (Shopify Fully Managed)**:
```json
{
  "platform": "ShopifyFullyManaged",
  "client_id": "shopify_client_id",
  "client_secret": "shopify_client_secret",
  "account_id": "yourstore.myshopify.com"
}
```

#### Update Integration
`PUT /functions/v1/integrations-api`

#### Delete Integration
`DELETE /functions/v1/integrations-api`

#### Test Connection
`GET /functions/v1/integrations-api?integrationId=xxx`

### WordPress Features
- Application Password encryption (AES-256-CBC)
- REST API connection validation
- Credential validation before storage

### Shopify Fully Managed Features
- Store domain validation
- Client ID/Secret format validation
- OAuth token storage

### Environment Variables
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `WORDPRESS_ENCRYPTION_KEY` - 32-character key for password encryption (optional, has default)

### Security
- All requests require authentication via Authorization header
- WordPress passwords are encrypted before storage
- Credentials are validated before saving to database
