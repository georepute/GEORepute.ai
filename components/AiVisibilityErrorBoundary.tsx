'use client';

import React from 'react';
import { reportAiVisibilityError } from '@/lib/ai-visibility-error-report';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AiVisibilityErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    reportAiVisibilityError(error, {
      source: 'AI Visibility (Error Boundary)',
      context: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-red-200">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              An error occurred in AI Visibility. The admin has been notified with a
              detailed report and will look into it as soon as possible.
            </p>
            <p className="text-xs text-gray-500 mb-4 font-mono truncate" title={this.state.error.message}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
