import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 256, padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
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
