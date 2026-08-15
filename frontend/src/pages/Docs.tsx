import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAccountContext } from '../components/AccountContext'
import { useAccountBase } from '../lib/account'

interface Block {
  type: 'h' | 'p' | 'list'
  text: string
  items?: string[]
}

interface DocSection {
  id: string
  title: string
  blocks: Block[]
}

const BUSINESS_DOCS: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    blocks: [
      { type: 'p', text: 'Wealfull helps businesses run their CRM: track customers, orders, services, materials, projects, invoices and payments in one place.' },
      { type: 'h', text: 'Your account' },
      { type: 'p', text: 'Your account groups all your business data. You can switch between accounts from the logo menu in the header, and each account has its own dashboard and settings.' },
      { type: 'h', text: 'Companies' },
      { type: 'p', text: 'Add the companies you work with under Employers, then assign services, materials and projects to them.' },
    ],
  },
  {
    id: 'orders',
    title: 'Orders',
    blocks: [
      { type: 'p', text: 'Orders are the core unit of work in Wealfull. An order links a customer to services, materials and projects.' },
      { type: 'list', text: 'To create an order:', items: ['Open Orders and click "New order"', 'Select the customer and service', 'Add materials if required', 'Choose the project to attach the order to', 'Save — the order appears in the list'] },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    blocks: [
      { type: 'p', text: 'Services describe what you sell or provide. Each order references a service.' },
      { type: 'p', text: 'Keep the service list up to date so orders can be created quickly with the right pricing and details.' },
    ],
  },
  {
    id: 'materials',
    title: 'Materials',
    blocks: [
      { type: 'p', text: 'Materials are the items consumed or used when fulfilling orders. Attach them to orders to track what was used.' },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    blocks: [
      { type: 'p', text: 'Projects group related orders together so you can see the full picture of a larger engagement.' },
    ],
  },
  {
    id: 'customers',
    title: 'Customers',
    blocks: [
      { type: 'p', text: 'Customers are the people and companies you work with.' },
      { type: 'list', text: 'With a customer you can:', items: ['Store contact details and addresses', 'View and create orders for them', 'Keep track of their history'] },
    ],
  },
  {
    id: 'invoices',
    title: 'Invoices',
    blocks: [
      { type: 'p', text: 'Invoices are created from orders and represent what the customer owes. Track them on the Invoices page and mark them as paid under Payments.' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    blocks: [
      { type: 'p', text: 'The Payments page shows payments against your invoices so you can always see what has been received and what is outstanding.' },
    ],
  },
  {
    id: 'api',
    title: 'API',
    blocks: [
      { type: 'p', text: 'Integrate your own systems with Wealfull using API keys.' },
      { type: 'list', text: 'Best practices:', items: ['Create one key per integration', 'Bind each key to the domain (or IP) it will be used from', 'Store keys in a safe place — they are shown fully only once', 'Revoke keys you no longer use'] },
    ],
  },
]

const EMPLOYER_DOCS: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    blocks: [
      { type: 'p', text: 'The Wealfull employer account lets you work as an individual: place orders, manage services and track payments without a company structure.' },
      { type: 'h', text: 'Your account' },
      { type: 'p', text: 'Your account keeps your work separate from business accounts. Switch accounts from the logo menu in the header.' },
    ],
  },
  {
    id: 'orders',
    title: 'Orders',
    blocks: [
      { type: 'p', text: 'Create orders for the work you need, attach services and materials, and follow them through to invoicing.' },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    blocks: [
      { type: 'p', text: 'Services define what can be ordered. Pick the right service when creating an order.' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    blocks: [
      { type: 'p', text: 'See what you owe and what you have paid. Payments are matched against your invoices.' },
    ],
  },
  {
    id: 'api',
    title: 'API',
    blocks: [
      { type: 'p', text: 'Connect your own tools to Wealfull with API keys. Bind each key to the domain or IP it will be used from, and revoke keys you no longer use.' },
    ],
  },
]

const FALLBACK_DOCS = BUSINESS_DOCS

export default function DocsPage() {
  const { account } = useAccountContext()
  const base = useAccountBase()
  const typeName = account?.account_type?.name
  const sections = typeName === 'Employer' ? EMPLOYER_DOCS : typeName === 'Business' ? BUSINESS_DOCS : FALLBACK_DOCS
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('section')
  const [active, setActive] = useState(requested ?? sections[0]?.id ?? '')
  const current = sections.find((s) => s.id === active) ?? sections[0]

  function select(id: string) {
    setActive(id)
    setSearchParams(id === sections[0]?.id ? {} : { section: id }, { replace: true })
  }

  return (
    <div className="docs">
      <header className="docs-header">
        <span className="brand-mark">W</span>
        <span className="docs-header-title">Documentation</span>
        <Link className="docs-back" to={base}>
          Back to app
        </Link>
      </header>
      <div className="docs-body">
        <aside className="docs-sidebar">
          <nav className="nav">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className={s.id === current?.id ? 'nav-link active' : 'nav-link'}
                onClick={() => select(s.id)}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </aside>
        <div className="docs-content">
          {current ? (
            <>
              <h2>{current.title}</h2>
              {current.blocks.map((b, i) => {
                if (b.type === 'h') return <h3 key={i}>{b.text}</h3>
                if (b.type === 'list')
                  return (
                    <div key={i}>
                      <p>{b.text}</p>
                      <ul>
                        {b.items?.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )
                return <p key={i}>{b.text}</p>
              })}
            </>
          ) : (
            <p>Select a section on the left.</p>
          )}
        </div>
      </div>
    </div>
  )
}
