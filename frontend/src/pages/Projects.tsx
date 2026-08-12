import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Project } from '../api'

const startLine = (p: Project) =>
  p.start_time ? new Date(p.start_time).toLocaleString() : '—'

export default function Projects() {
  const [items, setItems] = useState<Project[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .projects()
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle no-margin">Your projects.</p>
        </div>
        <Link to="/app/projects/new" className="button">
          + Create project
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Start time</th>
            <th>Duration</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>
                <strong>{p.name}</strong>
              </td>
              <td>{startLine(p)}</td>
                <td>{p.duration}–{p.duration_to} {p.duration_unit}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
              <td>
                <Link to={`/app/projects/${p.id}/edit`} className="btn-secondary btn-sm">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="empty">
                No projects.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}
