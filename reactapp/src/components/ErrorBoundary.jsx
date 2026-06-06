import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 256, padding: 32, textAlign: 'center',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, margin: '0 auto 16px', fontSize: '1.5rem', color: '#f59e0b', fontWeight: 900 }}>!</div>
          <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>
            Something went wrong
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 16 }}>
            This section encountered an error. Your profile data is safe.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
              padding: '8px 16px', borderRadius: 8, fontSize: '0.75rem',
              background: 'transparent', cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(245,158,11,0.1)'}
            onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
