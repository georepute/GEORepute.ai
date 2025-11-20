# Setting Up Edge Function Secrets for Brand Analysis

## ✅ **Using Supabase Secrets (Recommended)**

Instead of storing API keys in a database table, we now use **Supabase Edge Function secrets** which is simpler and more secure.

---

## 🔑 **Required Secrets**

Set these secrets for the `brand-analysis` Edge Function:

```bash
# Required: Service role key for database access
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key

# API Keys for AI Platforms
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set CLAUDE_API_KEY=sk-ant-your-claude-key
supabase secrets set GEMINI_API_KEY=your-gemini-key
supabase secrets set PERPLEXITY_API_KEY=pplx-your-perplexity-key
supabase secrets set GROQ_API_KEY=gsk_your-groq-key
```

---

## 📋 **Step-by-Step Setup**

### 1. **Get Your Service Role Key**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (⚠️ Keep this secret!)

### 2. **Set Secrets Using Supabase CLI**

Make sure you're in your project directory and linked to your Supabase project:

```bash
cd /Users/apple/Projects/GEORepute.ai

# Link project if not already linked
supabase link --project-ref YOUR_PROJECT_REF

# Set service role key (REQUIRED)
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key_here

# Set API keys (set only the ones you need)
supabase secrets set OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
supabase secrets set CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
supabase secrets set GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxx
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxx
supabase secrets set GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### 3. **Verify Secrets Are Set**

```bash
# List all secrets (values are hidden for security)
supabase secrets list
```

You should see:
- `SERVICE_ROLE_KEY` ✅
- `OPENAI_API_KEY` ✅ (if set)
- `CLAUDE_API_KEY` ✅ (if set)
- `GEMINI_API_KEY` ✅ (if set)
- `PERPLEXITY_API_KEY` ✅ (if set)
- `GROQ_API_KEY` ✅ (if set)

---

## 🎯 **How It Works**

The Edge Function now reads API keys directly from secrets:

```typescript
// In supabase/functions/brand-analysis/index.ts
function getApiKey(keyType) {
  const envVarName = `${keyType.toUpperCase()}_API_KEY`;
  return Deno.env.get(envVarName); // Reads from Supabase secrets
}
```

**Mapping:**
- `keyType: 'openai'` → `OPENAI_API_KEY`
- `keyType: 'claude'` → `CLAUDE_API_KEY`
- `keyType: 'gemini'` → `GEMINI_API_KEY`
- `keyType: 'perplexity'` → `PERPLEXITY_API_KEY`
- `keyType: 'groq'` → `GROQ_API_KEY`

---

## ✅ **Benefits of Using Secrets**

1. **Simpler** - No database table needed
2. **More Secure** - Managed by Supabase, encrypted at rest
3. **Easier Updates** - Just update the secret, no code changes
4. **No Encryption/Decryption** - Keys stored as-is (Supabase handles security)
5. **Better for CI/CD** - Secrets can be set per environment

---

## 🔄 **Updating Secrets**

To update an API key:

```bash
# Just set it again with the new value
supabase secrets set OPENAI_API_KEY=sk-new-key-here
```

The Edge Function will automatically use the new value on the next invocation.

---

## 🚨 **Troubleshooting**

### Error: "No openai key found in secrets"
- Make sure you've set the secret: `supabase secrets set OPENAI_API_KEY=...`
- Verify with: `supabase secrets list`
- Redeploy the function: `supabase functions deploy brand-analysis`

### Error: "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Error: "SERVICE_ROLE_KEY not set"
- This is required! Set it: `supabase secrets set SERVICE_ROLE_KEY=...`

---

## 📝 **Notes**

- **Secrets are per-project** - Each Supabase project has its own secrets
- **Secrets are encrypted** - Supabase handles encryption at rest
- **Secrets are not visible** - When listing, values are hidden
- **Secrets persist** - They remain until you delete them
- **No redeploy needed** - Just update the secret, function picks it up automatically

---

## 🗑️ **Removing Secrets**

If you need to remove a secret:

```bash
# Note: Supabase CLI doesn't have a direct "delete" command
# You can set it to empty or contact Supabase support
# Or just set a new value to replace it
```

---

## ✅ **Summary**

**You DON'T need the `admin_api_keys` table anymore!**

Just set secrets using:
```bash
supabase secrets set SERVICE_ROLE_KEY=...
supabase secrets set OPENAI_API_KEY=...
# etc.
```

The Edge Function will automatically use these secrets. 🎉

