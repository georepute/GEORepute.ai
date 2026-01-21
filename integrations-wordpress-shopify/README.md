# WordPress & Shopify Fully Managed Integrations

Complete code package for WordPress and Shopify Fully Managed integrations.

## 📁 Folder Structure

```
integrations-wordpress-shopify/
├── edge-functions/          # Supabase Edge Functions
│   ├── shopify-managed-oauth-callback/
│   └── integrations-api/
├── frontend/                # React/TypeScript Frontend Components
│   ├── components/
│   └── utils/
├── guides/                  # Integration Guides
│   ├── wordpress-guide.md
│   └── shopify-guide.md
└── README.md
```

## 🚀 Quick Start

### Edge Functions Setup

1. Deploy edge functions to Supabase:
   ```bash
   supabase functions deploy shopify-managed-oauth-callback
   supabase functions deploy integrations-api
   ```

2. Set environment variables:
   - `WORDPRESS_ENCRYPTION_KEY` - 32 character key for WordPress password encryption
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key

### Frontend Integration

1. Copy frontend components to your project
2. Import and use `ConnectIntegrationDialog` component
3. Follow the guides in the `guides/` folder

## 📚 Documentation

- [WordPress Integration Guide](./guides/wordpress-guide.md)
- [Shopify Fully Managed Guide](./guides/shopify-guide.md)

## 🔐 Security Notes

- WordPress Application Passwords are encrypted using AES-256-CBC
- Shopify OAuth tokens are stored securely
- All credentials are validated before storage
