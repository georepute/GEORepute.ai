# WordPress Integration Guide

Complete guide for connecting your self-hosted WordPress site to Outranker.

## Prerequisites

- WordPress site with REST API enabled (default in WordPress 4.7+)
- Administrator account access
- Application Password feature enabled (default in WordPress 5.6+)

## Step-by-Step Setup

### Step 1: Log in to WordPress Admin

1. Navigate to your WordPress admin dashboard
2. Log in with an administrator account
3. Go to **Users** in the left sidebar

### Step 2: Create or Select Administrator User

- If you already have an administrator account, you can use it
- If not, create a new user with Administrator role:
  - Click **Add New**
  - Fill in username, email, and set role to **Administrator**
  - Click **Add New User**

### Step 3: Generate Application Password

1. Go to **Users → All Users**
2. Click on the username of the administrator account
3. Scroll down to the **Application Passwords** section
4. Enter an application name (e.g., "Outranker Integration")
5. Click **Add New Application Password**
6. **IMPORTANT**: Copy the generated 24-character password immediately - you won't be able to see it again!

### Step 4: Copy Username

1. Scroll up to the top of the profile page
2. Locate the **Username** field
3. Copy this username

### Step 5: Connect in Outranker

1. Go to **Integrations** in Outranker dashboard
2. Select **WordPress (Self-Hosted)**
3. Enter:
   - **WordPress Site URL**: Your site URL (e.g., https://yoursite.com)
   - **WordPress Username**: The username you copied
   - **Application Password**: The 24-character password you generated
4. Click **Connect**

## Troubleshooting

### Error: "WordPress REST API not found"
- Ensure your WordPress site is version 4.7 or higher
- Check that REST API is not disabled by a plugin
- Verify the site URL is correct and accessible

### Error: "Invalid WordPress credentials"
- Double-check the username is correct (case-sensitive)
- Regenerate the Application Password if needed
- Ensure the user has Administrator role

### Error: "Failed to connect to WordPress site"
- Verify the site URL is accessible from the internet
- Check for firewall or security plugin blocking REST API
- Ensure HTTPS is properly configured if using SSL

## Security Notes

- Application Passwords are encrypted using AES-256-CBC before storage
- Only use Application Passwords, never your main WordPress password
- You can revoke Application Passwords at any time from the user profile

## Screenshots

See the full guide with screenshots at: `/dashboard/integration-guides/wordpress`
