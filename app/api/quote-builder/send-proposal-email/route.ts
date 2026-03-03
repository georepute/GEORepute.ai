import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function getBaseUrl(request: NextRequest): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return (process.env.NEXT_PUBLIC_APP_URL as string).replace(/\/+$/, "");
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/**
 * POST /api/quote-builder/send-proposal-email
 * Sends the proposal link to the quote's client_email, then sets quote status to "sent".
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD to be configured.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const quoteId = body.quoteId;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";

    if (!quoteId) {
      return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
    }

    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, client_email, client_name, share_token, status, domain")
      .eq("id", quoteId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const toOverride = typeof body.to === "string" ? body.to.trim() : "";
    const to = toOverride || (quote.client_email || "").trim();
    if (!to) {
      return NextResponse.json(
        { error: "Add client email in Domain & Client to send the proposal by email." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const proposalLink = `${baseUrl}/proposals/${quote.share_token}`;
    const clientName = quote.client_name || "Proposal";
    const subject = `Strategic Intelligence Proposal – ${clientName}`;
    const defaultBody = "Please find your Strategic Intelligence Proposal attached and the link below.";
    const messageHtml = message
      ? message.replace(/\n/g, "</p><p>")
      : defaultBody;
    const html = `
      <p>${messageHtml}</p>
      <p><a href="${proposalLink}">View proposal online</a></p>
      <p style="word-break: break-all; color: #666;">${proposalLink}</p>
      <p>Best regards</p>
    `;

    const attachments: { filename: string; content: Buffer }[] = [];
    if (pdfBase64) {
      try {
        const buf = Buffer.from(pdfBase64, "base64");
        if (buf.length > 0) {
          const filename = `Proposal-${(quote.domain || "quote").replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf`;
          attachments.push({ filename, content: buf });
        }
      } catch {
        // ignore invalid base64
      }
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      attachments: attachments.length ? attachments : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", quoteId)
      .eq("user_id", session.user.id);

    if (updateError) {
      console.error("Quote status update error:", updateError);
      return NextResponse.json(
        { success: true, sent: true, error: "Email sent but failed to update status to sent." },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, sent: true });
  } catch (e) {
    console.error("Send proposal email error:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
