/**
 * Report an AI Visibility error to the backend. Backend generates a PDF and emails it to admin.
 */
export interface ErrorReportPayload {
  message: string;
  stack?: string;
  source?: string;
  context?: string | Record<string, unknown>;
}

export async function reportAiVisibilityError(
  error: unknown,
  context?: Partial<ErrorReportPayload>
): Promise<void> {
  const message =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const stack = error instanceof Error ? error.stack : undefined;
  const payload = {
    message,
    stack,
    source: context?.source ?? 'AI Visibility',
    context: context?.context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch('/api/ai-visibility/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Failed to send AI Visibility error report:', e);
  }
}
