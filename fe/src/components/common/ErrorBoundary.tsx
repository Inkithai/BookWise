// src/components/ErrorBoundary.tsx
"use client";
import React, { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error);
    console.error("Error info:", errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Parse error to provide more specific messages
      const errorMessage = this.state.error?.message || '';
      let userFriendlyMessage = 'An unexpected error occurred';
      let suggestion = 'Please try refreshing the page.';
      
      // Network errors
      if (errorMessage.includes('Network Error') || errorMessage.includes('network')) {
        userFriendlyMessage = 'Network connection error';
        suggestion = 'Please check your internet connection and try again.';
      }
      // Timeout errors
      else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        userFriendlyMessage = 'Request timed out';
        suggestion = 'The server is taking too long to respond. Please try again.';
      }
      // Authentication errors
      else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userFriendlyMessage = 'Session expired';
        suggestion = 'Please log in again to continue.';
      }
      // Permission errors
      else if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('permission')) {
        userFriendlyMessage = 'Access denied';
        suggestion = 'You do not have permission to perform this action.';
      }
      // Not found errors
      else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        userFriendlyMessage = 'Resource not found';
        suggestion = 'The requested resource may have been removed or is unavailable.';
      }
      // Server errors
      else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        userFriendlyMessage = 'Server error';
        suggestion = 'Our servers are experiencing issues. Please try again later.';
      }
      // Rate limiting
      else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        userFriendlyMessage = 'Too many requests';
        suggestion = 'Please wait a moment before trying again.';
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f8f9fa",
            padding: "20px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              maxWidth: "500px",
              width: "100%",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h1 style={{ color: "#dc2626", marginBottom: "10px", fontSize: "24px" }}>
              {userFriendlyMessage}
            </h1>
            <p style={{ color: "#666", marginBottom: "20px", lineHeight: "1.5" }}>
              {suggestion}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details
                style={{
                  marginBottom: "20px",
                  padding: "10px",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "4px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <summary style={{ color: "#666", fontWeight: "bold" }}>
                  Error details (Development only)
                </summary>
                <pre
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#fff",
                    borderRadius: "4px",
                    overflow: "auto",
                    fontSize: "12px",
                    color: "#dc2626",
                  }}
                >
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={this.resetError}
              style={{
                padding: "10px 20px",
                backgroundColor: "#14B8A6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
              onMouseOver={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor =
                  "#0D9488";
              }}
              onMouseOut={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor =
                  "#14B8A6";
              }}
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