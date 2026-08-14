import { Link } from 'react-router-dom'

export default function ErrorPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">!</span>
          <h1>Something went wrong</h1>
          <p>The request could not be completed. Check your connection and try again.</p>
        </div>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
        <p className="hint">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}