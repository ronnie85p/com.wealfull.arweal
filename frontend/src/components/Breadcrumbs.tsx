import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="crumb-sep">/</span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span className="crumb-current">{item.label}</span>}
        </Fragment>
      ))}
    </nav>
  )
}