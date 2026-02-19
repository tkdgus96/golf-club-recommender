import { Component, type ErrorInfo, type ReactNode } from "react";
import { recordError } from "../../utils/monitoring";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  eventId: string | null;
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    eventId: null,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true, eventId: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const eventId = recordError(error, "react.errorBoundary", {
      componentStack: errorInfo.componentStack,
    });
    this.setState({ eventId });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-boundary">
          <h1>Something went wrong</h1>
          <p>
            The app hit an unexpected error. A local diagnostics event was captured
            to support debugging.
          </p>
          {this.state.eventId && (
            <p className="app-error-id">Event ID: {this.state.eventId}</p>
          )}
          <div className="app-error-actions">
            <button className="btn btn-primary" onClick={this.handleReload}>
              Reload App
            </button>
            <a className="btn btn-secondary" href="/">
              Go Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

