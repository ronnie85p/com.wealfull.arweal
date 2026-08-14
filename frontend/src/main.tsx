import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './components/AuthContext'
import { loadConfig, isConfigFailed, fetchAuthStatus } from './api/client'
import ErrorPage from './pages/Error'
import './index.css'

async function boot() {
  const [auth] = await Promise.all([fetchAuthStatus(), loadConfig()])
  const rootEl = document.getElementById('root')!

  if (isConfigFailed() || auth.failed) {
    ReactDOM.createRoot(rootEl).render(
      <BrowserRouter>
        <ErrorPage />
      </BrowserRouter>,
    )
    return
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider initial={{ user: auth.user, authenticated: auth.authenticated }}>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}

boot()