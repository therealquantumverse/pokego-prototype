import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('[app crash]', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#0f1724', color: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 32, fontFamily: 'Nunito, system-ui, sans-serif',
          textAlign: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 48 }}>😵</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Something went wrong</h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px', borderRadius: 14, border: 0,
              background: '#e31e24', color: '#fff', fontSize: 15, fontWeight: 900,
              cursor: 'pointer', marginTop: 8,
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
