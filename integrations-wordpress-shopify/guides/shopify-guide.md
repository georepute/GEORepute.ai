# Shopify Fully Managed Integration Guide

Complete guide for connecting your Shopify store using your own custom app credentials.

## Prerequisites

- Shopify store with admin access
- Owner or staff account with app development permissions

## Step-by-Step Setup

### Step 1: Sign in to Shopify Admin

1. Log into your Shopify admin dashboard
2. Ensure you're in the correct store (check top-right corner)
3. You need owner or admin permissions to create custom apps

### Step 2: Navigate to App Development

1. From the left navigation, click **Apps**
2. Click **Apps and sales channels**
3. Click **Develop apps** (this opens the developer workspace)
4. Click **Build apps** to access the custom app dashboard

### Step 3: Create Custom App

1. Click **Create an app**
2. Enter an **App name** (e.g., "Outranker Managed Publishing")
3. Select your account as the app developer
4. Click **Create app**

### Step 4: Configure App URLs

1. In the **App URL** field, enter:
   ```
   https://outranker.ai/dashboard/integrations
   ```

2. In the **Allowed redirection URL(s)** field, enter:
   ```
   https://outranker.ai/dashboard/integrations
   ```

3. Click **Save**

### Step 5: Configure API Scopes

1. Click **Configure Admin API scopes**
2. Enable the following scopes:
   - `read_content` - Read blog posts
   - `write_content` - Create and edit blog posts
3. Click **Save**

### Step 6: Install App and Get Credentials

1. Click **Install app** button
2. Review and approve the permissions
3. After installation, you'll see:
   - **Client ID** (API key)
   - **Client secret** (API secret key)
4. **Copy both values** - you'll need them in Outranker

### Step 7: Connect in Outranker

1. Go to **Integrations** in Outranker dashboard
2. Select **Shopify Fully Managed**
3. Enter:
   - **Shopify Store URL**: Your store domain (e.g., yourstore.myshopify.com)
   - **Client ID**: The API key from Step 6
   - **Client Secret**: The API secret key from Step 6
4. Click **Connect to Shopify**
5. You'll be redirected to Shopify to approve the connection
6. After approval, you'll be redirected back and the integration will be complete

## Troubleshooting

### Error: "Shopify store URL must end with .myshopify.com"
- Use your store's myshopify.com domain, not your custom domain
- Format: `yourstore.myshopify.com` (no https://)

### Error: "Missing Shopify client credentials"
- Ensure you copied both Client ID and Client Secret correctly
- Check for extra spaces when pasting
- Regenerate credentials if needed from the app settings

### Error: "State validation failed"
- This usually means the OAuth flow was interrupted
- Try the connection process again from the beginning
- Clear browser cache if issues persist

### App Installation Fails
- Ensure you have owner or admin permissions
- Check that all required scopes are enabled
- Verify the redirect URL matches exactly

## Security Notes

- Client Secret is stored securely and never exposed
- Access tokens are encrypted in the database
- You can revoke access at any time from Shopify admin

## API Scopes Required

- `read_content` - Required to read existing blog posts
- `write_content` - Required to create and publish new blog posts

## Screenshots

See the full guide with screenshots at: `/dashboard/integration-guides/shopify-fully-managed`
