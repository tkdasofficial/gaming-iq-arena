import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let display = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(display) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        display = `Cloud ${parsed.operationType || 'operation'} failed${
          parsed.path ? ` (${parsed.path})` : ''
        }: ${parsed.error}`;
      }
    } catch {
      // Keep raw error message
    }
    return {
      hasError: true,
      message: display,
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
          <div className="surface w-full max-w-md space-y-5 rounded-3xl p-6">
            <div className="grid size-12 place-items-center rounded-2xl border border-primary/40 bg-primary/10">
              <AlertTriangle className="size-5 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-3xl font-bold tracking-tight">Something went wrong</h1>
              <p className="break-words text-sm text-muted-foreground">{this.state.message}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <RotateCcw className="size-4" />
              Reload Gaming IQ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
