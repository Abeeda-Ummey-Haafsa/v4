import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="error-boundary-container" className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-slate-50 rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto my-12">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 animate-bounce">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-sm">
            {this.state.error?.message || "An unexpected rendering exception was caught."}
          </p>
          <button
            id="error-boundary-retry-btn"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Retry and Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
