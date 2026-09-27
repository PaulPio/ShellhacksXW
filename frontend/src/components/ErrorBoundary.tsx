import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PantherPark crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <span className="eyebrow">Something went wrong</span>
          <h2>We couldn't render this page</h2>
          <p className="muted">{this.state.error.message}</p>
          <button onClick={() => window.location.reload()} className="btn btn-secondary">
            Reload PantherPark
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
