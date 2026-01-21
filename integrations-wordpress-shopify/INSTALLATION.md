# Installation Guide

## Prerequisites

- Supabase project with Edge Functions enabled
- React/TypeScript project (Next.js, Vite, or similar)
- Node.js 18+ and npm/yarn

## Step 1: Deploy Edge Functions

### Deploy Shopify OAuth Callback

```bash
cd integrations-wordpress-shopify/edge-functions/shopify-managed-oauth-callback
supabase functions deploy shopify-managed-oauth-callback
```

### Deploy Integrations API

```bash
cd integrations-wordpress-shopify/edge-functions/integrations-api
supabase functions deploy integrations-api
```

### Set Environment Variables

In your Supabase project dashboard, go to **Settings → Edge Functions → Secrets** and add:

- `WORDPRESS_ENCRYPTION_KEY` - A 32-character random string for encrypting WordPress passwords
- `SUPABASE_URL` - Your Supabase project URL (usually auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (usually auto-set)

**Generate WordPress Encryption Key:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 2: Database Setup

Ensure you have the following tables in your Supabase database:

### `integration_credentials` table
```sql
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  created_by_user_id UUID REFERENCES auth.users(id),
  platform_id UUID,
  platform TEXT NOT NULL,
  client_id TEXT,
  client_secret TEXT,
  account_id TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'connected',
  settings JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `admin_integration_platforms` table
```sql
CREATE TABLE IF NOT EXISTS admin_integration_platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT UNIQUE NOT NULL,
  is_live BOOLEAN DEFAULT true,
  is_oauth BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert platforms
INSERT INTO admin_integration_platforms (platform, is_live, is_oauth) 
VALUES 
  ('WordPress', true, false),
  ('ShopifyFullyManaged', true, false)
ON CONFLICT (platform) DO NOTHING;
```

## Step 3: Install Frontend Components

### Copy Components

Copy the frontend components to your project:

```bash
# Copy components
cp -r integrations-wordpress-shopify/frontend/components/* src/components/integrations/
```

### Install Dependencies

Ensure you have these UI components (shadcn/ui or similar):

- `@/components/ui/dialog`
- `@/components/ui/button`
- `@/components/ui/input`
- `@/components/ui/label`
- `@/components/ui/alert`
- `@/components/ui/toast`

### Update Imports

Update import paths in the components to match your project structure:

```typescript
// Example: Update these imports in ConnectIntegrationDialog.tsx
import { Dialog } from "@/components/ui/dialog"; // Adjust path as needed
import { useAuth } from "@/contexts/AuthContext"; // Adjust path as needed
import { supabase } from "@/integrations/supabase/client"; // Adjust path as needed
```

## Step 4: Usage

### Basic Integration

```tsx
import { ConnectIntegrationDialog } from "@/components/integrations/ConnectIntegrationDialog";

function MyComponent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const handleIntegrationAdded = (integration: IntegrationCredential) => {
    console.log('Integration added:', integration);
    // Refresh your integrations list
  };

  return (
    <>
      <button onClick={() => {
        setSelectedPlatform('WordPress'); // or 'ShopifyFullyManaged'
        setDialogOpen(true);
      }}>
        Connect WordPress
      </button>

      <ConnectIntegrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onIntegrationAdded={handleIntegrationAdded}
        preselectedPlatform={selectedPlatform}
      />
    </>
  );
}
```

## Step 5: Testing

### Test WordPress Integration

1. Create a test WordPress site or use an existing one
2. Generate an Application Password
3. Use the ConnectIntegrationDialog to connect
4. Verify the integration appears in your database

### Test Shopify Fully Managed Integration

1. Create a custom app in your Shopify store
2. Get Client ID and Client Secret
3. Use the ConnectIntegrationDialog to connect
4. Complete the OAuth flow
5. Verify the integration appears in your database

## Troubleshooting

### Edge Functions Not Deploying

- Check Supabase CLI is installed: `supabase --version`
- Verify you're logged in: `supabase login`
- Check project link: `supabase link --project-ref your-project-ref`

### Frontend Components Not Working

- Verify all UI component dependencies are installed
- Check import paths match your project structure
- Ensure Supabase client is properly configured

### Integration Connection Fails

- Check browser console for errors
- Verify edge functions are deployed and accessible
- Check Supabase logs: `supabase functions logs function-name`
- Verify environment variables are set correctly

## Next Steps

- Review the guides in `guides/` folder for detailed setup instructions
- Customize the UI components to match your design system
- Add error handling and loading states as needed
- Implement integration management features (list, edit, delete)
