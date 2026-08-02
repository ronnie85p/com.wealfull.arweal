import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>404</h1>
        <p>Page not found.</p>
        <Link to="/app">Back to cabinet</Link>
      </div>
    </div>
  )
}