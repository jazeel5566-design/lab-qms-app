import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { isSupabaseConfigured } from './supabaseClient.js'
import './index.css'

function ConfigError() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F6FAF9', fontFamily: 'system-ui, sans-serif', padding: 24,
    }}>
      <div style={{ maxWidth: 480, background: 'white', border: '1px solid #E1EBE8', borderRadius: 12, padding: 28 }}>
        <div style={{ color: '#B4453F', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Configuration missing</div>
        <p style={{ color: '#0F2A3D', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
          This app can't connect to its database because <code>VITE_SUPABASE_URL</code> and/or{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> aren't set.
        </p>
        <p style={{ color: '#6B7A78', fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>
          <strong>Running locally:</strong> copy <code>.env.example</code> to <code>.env</code>, fill in your
          Supabase project's URL and anon key (Project Settings → API), then restart <code>npm run dev</code>.
        </p>
        <p style={{ color: '#6B7A78', fontSize: 13, lineHeight: 1.6 }}>
          <strong>Deployed on Vercel:</strong> Project Settings → Environment Variables → add both → then go to
          Deployments and click <strong>Redeploy</strong>. Adding environment variables does not automatically
          rebuild an existing deployment.
        </p>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Uncaught error in Lab QMS:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F6FAF9', fontFamily: 'system-ui, sans-serif', padding: 24,
        }}>
          <div style={{ maxWidth: 560, background: 'white', border: '1px solid #E1EBE8', borderRadius: 12, padding: 28 }}>
            <div style={{ color: '#B4453F', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Something went wrong</div>
            <p style={{ color: '#0F2A3D', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
              The app hit an unexpected error instead of loading. This is deliberately shown on-screen (rather
              than a blank page) so it can be reported and fixed. The technical detail below is safe to share:
            </p>
            <pre style={{
              background: '#F0F5F3', color: '#14746F', fontSize: 12, padding: 12, borderRadius: 8,
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{String(this.state.error?.message || this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isSupabaseConfigured ? <App /> : <ConfigError />}
    </ErrorBoundary>
  </React.StrictMode>,
)
