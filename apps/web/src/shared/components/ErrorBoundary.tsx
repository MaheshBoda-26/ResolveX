'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-dark mb-2">
            Something went wrong
          </h2>
          <p className="text-text-secondary dark:text-text-muted mb-6 max-w-md">
            We encountered an unexpected error. Please try again or refresh the page.
          </p>
          <Button onClick={this.handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          {this.state.error && (
            <details className="mt-6 w-full max-w-md text-left">
              <summary className="text-caption text-text-muted cursor-pointer">Error details</summary>
              <pre className="mt-2 p-3 text-xs bg-surface-default dark:bg-surface-dark rounded border border-border-default dark:border-border-dark overflow-auto">
                {this.state.error.message}
                {this.state.error.stack && '\n\n' + this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
