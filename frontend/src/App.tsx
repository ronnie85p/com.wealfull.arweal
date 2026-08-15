import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute, { PublicRoute } from './components/ProtectedRoute'
import PageSkeleton from './components/PageSkeleton'
import { useAuth } from './components/AuthContext'
import { AccountProvider } from './components/AccountContext'
import { accountBase } from './lib/account'
import ErrorPage from './pages/Error'
import ApiPage from './pages/Api'
import DocsPage from './pages/Docs'
import CreateCustomer from './pages/CreateCustomer'
import CreateOrder from './pages/CreateOrder'
import CustomerAddresses from './pages/CustomerAddresses'
import CustomerCreateAddress from './pages/CustomerCreateAddress'
import CustomerDetail from './pages/CustomerDetail'
import Customers from './pages/Customers'
import Dashboard from './pages/Dashboard'
import EditCustomer from './pages/EditCustomer'
import EditOrder from './pages/EditOrder'
import Invoices from './pages/Invoices'
import Login from './pages/Login'
import Register from './pages/Register'
import Confirm from './pages/Confirm'
import Security from './pages/Security'
import Password from './pages/Password'
import NotAuthorized from './pages/NotAuthorized'
import Orders from './pages/Orders'
import Payments from './pages/Payments'
import Services from './pages/Services'
import CreateService from './pages/CreateService'
import EditService from './pages/EditService'
import Materials from './pages/Materials'
import CreateMaterial from './pages/CreateMaterial'
import EditMaterial from './pages/EditMaterial'
import Projects from './pages/Projects'
import CreateProject from './pages/CreateProject'
import EditProject from './pages/EditProject'
import Employers from './pages/Employers'
import CreateCompany from './pages/CreateCompany'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

export default function App() {
  const { loading, error, user } = useAuth()

  if (error) return <ErrorPage />
  if (loading) return <PageSkeleton />

  const base = accountBase(user?.id)

  return (
    <AccountProvider>
      <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/confirm"
        element={
          <PublicRoute>
            <Confirm />
          </PublicRoute>
        }
      />
      <Route
        path="/password"
        element={
          <PublicRoute>
            <Password />
          </PublicRoute>
        }
      />
      <Route
        path="/security"
        element={
          <PublicRoute>
            <Security />
          </PublicRoute>
        }
      />
      <Route path="/403" element={<NotAuthorized />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/:accountId"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="api" element={<ApiPage />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CreateCustomer />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/addresses" element={<CustomerAddresses />} />
        <Route path="customers/:id/addresses/new" element={<CustomerCreateAddress />} />
        <Route path="customers/:id/edit" element={<EditCustomer />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<CreateOrder />} />
        <Route path="orders/:id/edit" element={<EditOrder />} />
        <Route path="services" element={<Services />} />
        <Route path="services/new" element={<CreateService />} />
        <Route path="services/:id/edit" element={<EditService />} />
        <Route path="materials" element={<Materials />} />
        <Route path="materials/new" element={<CreateMaterial />} />
        <Route path="materials/:id/edit" element={<EditMaterial />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<CreateProject />} />
        <Route path="projects/:id/edit" element={<EditProject />} />
        <Route path="employers" element={<Employers />} />
        <Route path="companies/new" element={<CreateCompany />} />
        <Route path="settings" element={<Settings />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="payments" element={<Payments />} />
      </Route>
      <Route path="/" element={<Navigate to={base} replace />} />
      <Route path="*" element={<NotFound />} />
      </Routes>
    </AccountProvider>
  )
}