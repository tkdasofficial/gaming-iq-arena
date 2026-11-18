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
        <div className="min-h-screen bg-[#0B0B0D] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#141417] border border-[#29292F] rounded-2xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#1B1B20] border border-[#F0263C]/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#F0263C]" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl font-bold text-white">
                Connection or Permission Error
              </h1>
              <p className="text-sm text-[#A1A1AA] break-words">
                {this.state.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-5 rounded-xl bg-[#F0263C] hover:bg-[#B8172A] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Gaming IQ</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
