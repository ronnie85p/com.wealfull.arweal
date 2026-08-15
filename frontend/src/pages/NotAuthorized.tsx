import { Link } from 'react-router-dom'
import { useAccountBase } from '../lib/account'

export default function NotAuthorized() {
  const base = useAccountBase()
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>403</h1>
        <p>You are not authorized to view this page.</p>
        <Link to={`${base}`}>Back to cabinet</Link>
      </div>
    </div>
  )
}