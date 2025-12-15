# DNS Verification Deep Debug Guide

## Overview

If you've added the TXT record to your DNS but verification is still failing, use the advanced debugging tools to diagnose the exact issue.

## New Debugging Tools

### 1. Check DNS Status
**What it does**: Queries your actual DNS records to see if the token is present
**When to use**: First step - confirms if DNS propagation is complete

**How to use**:
1. Click "Show Token" on your domain
2. Click "Check DNS Status" button
3. Review results

**What to look for**:
- ✅ **Token Found**: DNS is configured correctly
- ❌ **Token Not Found**: DNS hasn't propagated yet or record is incorrect

### 2. Debug Verification (Advanced)
**What it does**: Deep analysis of the verification process with Google's API
**When to use**: When DNS check shows token is found but verification still fails

**How to use**:
1. Click "Show Token" on your domain  
2. Click "Debug Verification (Advanced)" button
3. Review detailed analysis

**What it shows**:
- **Fresh Token**: Gets a new token from Google to compare with your stored token
- **Token Analysis**: Shows exact format Google expects
- **Requirements**: Shows which domain/subdomain needs the record
- **Verification Attempt**: Tries to verify and shows the exact error from Google

## Common Issues Found by Debug Tool

### Issue 1: Token Format Mismatch

**Symptom**: Debug shows "Token is missing the google-site-verification= prefix"

**Solution**:
```
Instead of: abc123def456...
Use: google-site-verification=abc123def456...
```

**Or try without prefix** - Some DNS providers automatically add it:
```
Just: abc123def456...
```

### Issue 2: Wrong Domain/Subdomain

**Symptom**: Debug shows "DNS record location: example.com" but you added it to "www.example.com"

**Solution**: 
- URL-prefix properties require the record on the EXACT domain
- For `https://example.com` → Add TXT to `example.com`
- For `https://www.example.com` → Add TXT to `www.example.com` subdomain

### Issue 3: URL-Prefix vs Domain Property

**Symptom**: Debug shows "This is a URL-prefix property"

**What it means**:
- URL-prefix: `https://example.com` (requires record on specific subdomain)
- Domain property: `sc-domain:example.com` (requires record on root domain)

**Current implementation**: We use URL-prefix properties

**Solution**: Make sure you add the TXT record to the exact domain shown in "DNS record location" field

### Issue 4: Stale Token

**Symptom**: Debug shows "Token matches: false"

**What it means**: The token stored in our database differs from what Google currently expects

**Solution**:
1. Delete the domain
2. Re-add it to get a fresh token
3. Add the new token to your DNS

### Issue 5: Token Still Not Visible

**Symptom**: DNS check shows "Token not found" even after waiting

**Possible causes**:
1. **Wrong record type**: Must be TXT, not CNAME or A record
2. **Extra spaces**: Copy token exactly without spaces
3. **Quotes**: Try with and without quotes
4. **Record name wrong**: Try @, empty, or domain name
5. **TTL too high**: Lower TTL for faster propagation
6. **DNS provider caching**: Some providers cache aggressively

**Solutions**:
```
# Try these variations for Record Name:
1. @
2. (leave blank/empty)
3. example.com
4. example.com. (with trailing dot)

# Try these variations for Record Value:
1. google-site-verification=abc123...
2. "google-site-verification=abc123..."
3. abc123... (without prefix)
```

## Step-by-Step Debugging Workflow

### Step 1: Basic DNS Check
```
1. Click "Show Token"
2. Click "Check DNS Status"
3. Wait for results
```

**If Token Found** → Go to Step 2
**If Token Not Found** → Wait longer or check DNS configuration

### Step 2: Advanced Debug
```
1. Click "Debug Verification (Advanced)"
2. Review "Token Analysis" section
3. Check "Requirements" section
4. Look at "Verification Error" details
```

### Step 3: Interpret Results

#### Scenario A: Token format issue
```
Debug shows:
- Has Prefix: ❌ No
- Expected: google-site-verification=YOUR_TOKEN

Action: Add the prefix to your DNS record
```

#### Scenario B: Wrong domain
```
Debug shows:
- Site URL: https://www.example.com
- DNS Record Location: www.example.com

Action: Add TXT record to www subdomain, not root
```

#### Scenario C: Everything looks correct
```
Debug shows:
- Token format: ✅ Correct
- DNS location: ✅ Correct
- Verification Error: "Token could not be found"

Action: Wait 24-48 hours for global DNS propagation
```

## External Verification Tools

### Check DNS Propagation Globally
```
1. Go to https://dnschecker.org
2. Enter your domain (e.g., example.com)
3. Select "TXT" from dropdown
4. Check if your token appears in all locations
5. Green checkmarks = propagated, Red X = not yet
```

### Command Line Tools

**Windows PowerShell**:
```powershell
nslookup -type=txt example.com
```

**Mac/Linux**:
```bash
dig TXT example.com
```

**Look for**: Your `google-site-verification=` token in the output

## When All Else Fails

### Option 1: Switch to META Tag Verification
1. Delete the domain from the dashboard
2. Re-add the domain
3. If DNS verification fails automatically, it will offer META tag
4. Add the meta tag to your site's `<head>`:
   ```html
   <meta name="google-site-verification" content="YOUR_TOKEN" />
   ```
5. Verify immediately (no propagation wait!)

### Option 2: Use HTML File Verification
1. Create a file named as provided by Google
2. Upload to your website's root directory
3. Verify immediately

### Option 3: Use Google Analytics/Tag Manager
If you already have GA or GTM installed:
1. Use that method instead
2. Much faster than DNS

## Reading Debug Output

### Token Analysis Section
```json
{
  "length": 86,
  "has_prefix": false,
  "raw_value": "abc123def456...",
  "expected_dns_format": "google-site-verification=abc123def456..."
}
```

**Interpretation**:
- `has_prefix: false` → You need to add the prefix
- `expected_dns_format` → This is EXACTLY what should be in your DNS

### Requirements Section
```json
{
  "site_url_format": "https://example.com",
  "is_url_prefix": true,
  "is_domain_property": false,
  "dns_record_location": "example.com"
}
```

**Interpretation**:
- `is_url_prefix: true` → Record must be on exact domain
- `dns_record_location` → Add TXT record HERE

### Verification Error Section
```json
{
  "message": "The necessary verification token could not be found on your site.",
  "code": "verification_failed"
}
```

**Common messages**:
- "token could not be found" → DNS not propagated or wrong location
- "Invalid verification method" → Bug in our code (should be fixed now)
- "Site already verified" → Success! Reload the page

## Pro Tips

1. **Use multiple checkers**: Don't rely on just one DNS checker
2. **Check from different locations**: DNS propagates at different speeds globally
3. **Lower your TTL first**: Before adding the record, set TTL to 300 (5 min)
4. **Take screenshots**: Of your DNS settings for troubleshooting
5. **Contact DNS provider**: If debug shows everything correct but still fails after 48h

## Success Indicators

### You're on the right track if debug shows:
- ✅ Token format is correct
- ✅ DNS record location matches where you added it
- ✅ Fresh token matches stored token
- ❌ Only error is "token could not be found" → Just wait longer!

### You have a problem if debug shows:
- ❌ Token format mismatch → Fix the format
- ❌ Wrong DNS location → Move the record
- ❌ Token mismatch → Delete and re-add domain
- ❌ Different error message → Read error carefully and address it

## Still Stuck?

If after using all debug tools and waiting 48 hours it still doesn't work:

1. **Take screenshots** of:
   - Debug Verification output (all sections)
   - DNS Check results
   - Your DNS provider's TXT record settings
   - dnschecker.org results

2. **Check these specifics**:
   - Exact record type: TXT (not CNAME, A, or AAAA)
   - Exact record name used: @, empty, or domain
   - Exact record value: Include full output from debug
   - TTL value: Should be 3600 or lower

3. **Try META tag** instead - it's immediate and doesn't depend on DNS

The debug tool will tell you exactly what Google is looking for and exactly what format it expects. Follow its recommendations precisely!

