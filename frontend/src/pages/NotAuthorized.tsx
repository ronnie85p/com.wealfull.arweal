import { Link } from 'react-router-dom'

export default function NotAuthorized() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>403</h1>
        <p>You are not authorized to view this page.</p>
        <Link to="/app">Back to cabinet</Link>
      </div>
    </div>
  )
}