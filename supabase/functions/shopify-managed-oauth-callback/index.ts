import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, shop, state, clientId, clientSecret } = await req.json();

    if (!code || !shop) {
      throw new Error("Missing required parameters: code and shop");
    }

    if (!clientId || !clientSecret) {
      throw new Error("Missing Shopify client credentials");
    }

    if (!shop.endsWith(".myshopify.com")) {
      throw new Error("Invalid shop domain");
    }

    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        if (stateData.shop && stateData.shop !== shop) {
          throw new Error("State validation failed: shop mismatch");
        }
      } catch (error) {
        console.error("Failed to parse state for Shopify Fully Managed:", error);
        throw new Error("Invalid state parameter");
      }
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClientAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClientAuth.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Shopify managed token exchange error:", errorText);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token received from Shopify");
    }

    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    let shopInfo: any = null;
    if (shopInfoResponse.ok) {
      const shopData = await shopInfoResponse.json();
      shopInfo = shopData.shop;
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: platformData, error: platformError } = await supabaseAdmin
      .from("admin_integration_platforms")
      .select("id")
      .eq("platform", "ShopifyFullyManaged")
      .eq("is_live", true)
      .limit(1)
      .maybeSingle();

    if (platformError || !platformData) {
      console.error("ShopifyFullyManaged platform lookup error:", platformError);
      throw new Error("Shopify Fully Managed platform not found in database");
    }

    const sanitizedShop = shop.toLowerCase();

    // Remove existing integration for this user + shop if present
    await supabaseAdmin
      .from("integration_credentials")
      .delete()
      .eq("created_by_user_id", user.id)
      .eq("platform", "ShopifyFullyManaged")
      .eq("account_id", sanitizedShop);

    const { data: integration, error: dbError } = await supabaseAdmin
      .from("integration_credentials")
      .insert({
        user_id: user.id,
        created_by_user_id: user.id,
        platform_id: platformData.id,
        platform: "ShopifyFullyManaged",
        client_id: accessToken,
        client_secret: null,
        account_id: sanitizedShop,
        account_name: shopInfo?.name || sanitizedShop,
        status: "connected",
        settings: {
          shop_url: sanitizedShop,
          shop_name: shopInfo?.name,
          shop_email: shopInfo?.email,
          shop_domain: shopInfo?.domain,
          app_client_id: clientId,
          app_client_secret: clientSecret,
          access_token: accessToken,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error storing Shopify Fully Managed integration:", dbError);
      throw new Error(`Failed to store integration: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        integration,
        message: "Successfully connected to Shopify Fully Managed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Shopify Fully Managed OAuth callback error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
