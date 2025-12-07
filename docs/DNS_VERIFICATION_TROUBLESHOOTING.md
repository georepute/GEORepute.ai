# DNS Verification Troubleshooting Guide

## Problem: "The necessary verification token could not be found on your site"

This error means Google cannot find your DNS TXT record. Here's how to fix it:

## Step 1: Use the DNS Checker

1. Click **"Show Token"** on your domain
2. Click **"Check DNS Status"** button in the modal
3. Review the results:
   - ✅ **Token Found**: Your DNS is configured correctly! Just wait a bit longer and try verifying again
   - ❌ **Token Not Found**: Follow the steps below

## Step 2: Common DNS Configuration Issues

### Issue 1: Wrong Record Name/Host
**Problem**: Some DNS providers require different formats for the record name

**Solutions**:
- Try `@` (most common)
- Try leaving it blank/empty
- Try your full domain (e.g., `example.com`)
- Try `example.com.` with a trailing dot

### Issue 2: Quotes Around the Token
**Problem**: Some DNS providers automatically add quotes, some require manual quotes

**Solutions**:
- Add the token **without** quotes: `google-site-verification=ABC123...`
- If that doesn't work, try **with** quotes: `"google-site-verification=ABC123..."`
- Some providers need it in this format: `google-site-verification=ABC123` (without the prefix)

### Issue 3: DNS Propagation Time
**Problem**: DNS changes take time to propagate globally

**Timeline**:
- ⏱️ 5-15 minutes: Minimum wait time
- ⏱️ 1-2 hours: Average propagation time
- ⏱️ 24-48 hours: Maximum (rare)

**Check propagation**:
- Use https://dnschecker.org
- Enter your domain
- Select "TXT" record type
- Look for your verification token

### Issue 4: URL-Prefix vs Domain Property
**Problem**: Google treats `https://example.com` differently than `sc-domain:example.com`

**Current behavior**: This app uses URL-prefix properties (e.g., `https://example.com`)

**Solutions**:
- Make sure your TXT record is on the root domain
- The site URL being verified is shown in the modal
- For `https://example.com`, add TXT record to `example.com`
- For `https://www.example.com`, add TXT record to `www.example.com` subdomain

## Step 3: Verify Your DNS Provider Settings

### Common DNS Providers

#### Cloudflare
```
Type: TXT
Name: @
Content: google-site-verification=YOUR_TOKEN
TTL: Auto
Proxy status: DNS only (gray cloud)
```

#### GoDaddy
```
Type: TXT
Host: @
TXT Value: google-site-verification=YOUR_TOKEN
TTL: 1 Hour
```

#### Namecheap
```
Type: TXT Record
Host: @
Value: google-site-verification=YOUR_TOKEN
TTL: Automatic
```

#### Google Domains
```
Type: TXT
Name: @
Data: google-site-verification=YOUR_TOKEN
TTL: 3600
```

## Step 4: Alternative Verification Methods

If DNS verification continues to fail after 24 hours, try META tag verification:

1. Delete the failed domain
2. Re-add the domain
3. If DNS fails again, the system will automatically offer META tag verification as a fallback
4. Add the meta tag to your website's `<head>` section:
   ```html
   <meta name="google-site-verification" content="YOUR_TOKEN" />
   ```
5. Verify immediately (no propagation wait needed)

## Step 5: Advanced Debugging

### Check DNS directly with command line:

**Windows (PowerShell)**:
```powershell
nslookup -type=txt example.com
```

**Mac/Linux**:
```bash
dig TXT example.com
```

Look for your `google-site-verification` token in the results.

### Using the API directly

You can also check via our API:
```bash
curl -X POST /api/integrations/google-search-console/domains/check-dns \
  -H "Content-Type: application/json" \
  -d '{"domainId": "YOUR_DOMAIN_ID"}'
```

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Token could not be found" | DNS record not found | Wait longer or check DNS configuration |
| "DNS_TXT verification failed" | Wrong record format | Check record name and value format |
| "Invalid value at verification_type" | API error (fixed) | Run the database migration script |
| "NXDOMAIN" | Domain doesn't exist | Check domain spelling |
| "SERVFAIL" | DNS server error | Try again later or contact DNS provider |

## Still Not Working?

1. **Double-check the token**: Copy it again from the modal
2. **Remove and re-add the record**: Sometimes DNS providers cache incorrectly
3. **Try a different browser**: Clear cache and cookies
4. **Wait 24 hours**: Some DNS providers are slow
5. **Contact DNS provider**: They might have specific requirements
6. **Use META tag instead**: Faster and no DNS propagation needed

## Success Checklist

- [ ] TXT record added with correct token
- [ ] Record name is `@` or empty
- [ ] No extra quotes or spaces in the token
- [ ] Waited at least 30 minutes
- [ ] DNS checker shows the token
- [ ] Clicked "Check DNS Status" and token was found
- [ ] Clicked "Verify Domain Now"

If all checks pass and verification still fails, there might be an issue with Google's API. Wait a few hours and try again.

