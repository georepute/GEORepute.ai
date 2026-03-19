import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendErrorReportEmail } from '@/lib/email';
import { jsPDF } from 'jspdf';
import {
  getDisclaimerText,
  getMethodologyDisclaimerTitle,
} from '@/lib/disclaimer';

export const maxDuration = 30;

export interface ErrorReportBody {
  message: string;
  stack?: string;
  source?: string;
  context?: string | Record<string, unknown>;
  userAgent?: string;
  url?: string;
  timestamp?: string;
}

function buildErrorReportPdf(payload: ErrorReportBody): Buffer {
  const doc = new jsPDF({ format: 'a4' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  const addLine = (text: string, fontSize = 10, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += fontSize * 0.45;
    });
    y += 4;
  };

  doc.setFillColor(127, 99, 234);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Visibility Error Report', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${payload.timestamp || new Date().toISOString()}`,
    margin,
    24
  );
  doc.setTextColor(0, 0, 0);
  y = 36;

  addLine('Summary', 12, true);
  addLine(`Source: ${payload.source || 'AI Visibility'}`);
  addLine(`Message: ${payload.message || 'No message'}`);
  y += 4;

  if (payload.stack) {
    addLine('Stack trace', 11, true);
    addLine(payload.stack, 8);
  }

  if (payload.context) {
    addLine('Context', 11, true);
    const ctxStr =
      typeof payload.context === 'string'
        ? payload.context
        : JSON.stringify(payload.context, null, 2);
    addLine(ctxStr, 8);
  }

  if (payload.url) {
    addLine('URL', 11, true);
    addLine(payload.url, 9);
  }

  if (payload.userAgent) {
    addLine('User agent', 11, true);
    addLine(payload.userAgent, 8);
  }

  addLine(getMethodologyDisclaimerTitle('en'), 11, true);
  addLine(getDisclaimerText('en'), 8);

  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

export async function POST(request: NextRequest) {
  try {
    const serverSecret = request.headers.get('x-error-report-secret');
    const expectedSecret = process.env.AI_VISIBILITY_ERROR_REPORT_SECRET;
    if (serverSecret != null && serverSecret !== '') {
      if (expectedSecret == null || serverSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    let user: { id?: string; email?: string } | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u ?? null;
    } catch {
      // Proceed without user (e.g. billing or modal error before auth)
    }
    const adminEmail =
      process.env.AI_VISIBILITY_ERROR_ADMIN_EMAIL ||
      process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error('AI Visibility error report: ADMIN_EMAIL or AI_VISIBILITY_ERROR_ADMIN_EMAIL not set');
      return NextResponse.json(
        { error: 'Error reporting not configured (missing admin email)' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ErrorReportBody;
    const message =
      typeof body.message === 'string' ? body.message : 'Unknown error';
    const stack =
      typeof body.stack === 'string' ? body.stack : undefined;
    const source =
      typeof body.source === 'string' ? body.source : 'AI Visibility';
    const context = body.context;
    const userAgent =
      typeof body.userAgent === 'string'
        ? body.userAgent
        : request.headers.get('user-agent') || undefined;
    const url = typeof body.url === 'string' ? body.url : undefined;
    const timestamp = new Date().toISOString();

    const payload: ErrorReportBody = {
      message,
      stack,
      source,
      context,
      userAgent,
      url,
      timestamp,
    };

    const pdfBuffer = buildErrorReportPdf(payload);
    const subject = `[GeoRepute.ai] AI Visibility Error – ${source} – ${timestamp.slice(0, 19)}`;
    const html = `
      <p><strong>An error was reported from AI Visibility.</strong></p>
      <p><strong>Source:</strong> ${source}</p>
      <p><strong>Message:</strong> ${message}</p>
      <p><strong>Time:</strong> ${timestamp}</p>
      ${user ? `<p><strong>User:</strong> ${user.email || user.id}</p>` : ''}
      ${url ? `<p><strong>URL:</strong> ${url}</p>` : ''}
      <p>See the attached PDF for full details and stack trace.</p>
    `;

    const result = await sendErrorReportEmail(
      adminEmail,
      subject,
      html,
      pdfBuffer,
      `ai-visibility-error-${Date.now()}.pdf`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error in AI Visibility error-report route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
