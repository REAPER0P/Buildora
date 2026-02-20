import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
          <p className="text-gray-700 mb-4">Please refresh the page or try clearing your local storage.</p>
          <div className="bg-white p-4 rounded shadow text-left overflow-auto max-w-lg max-h-64 text-sm font-mono text-red-500 mb-4">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => {
                localStorage.clear();
                window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Clear Data & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
