import { Link } from 'react-router-dom'
import { useAccountBase } from '../lib/account'

export default function NotFound() {
  const base = useAccountBase()
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>404</h1>
        <p>Page not found.</p>
        <Link to={`${base}`}>Back to cabinet</Link>
      </div>
    </div>
  )
}