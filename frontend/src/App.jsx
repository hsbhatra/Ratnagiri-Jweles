import { Suspense, lazy, useEffect } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { Provider, useDispatch } from 'react-redux'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireAuth } from './components/auth/RouteGuards'
import LandingPage from './components/landing/LandingPage'
import { store } from './store'
import { fetchMe } from './store/authSlice'

// Account pages load on demand so the landing page bundle stays lean (NFR-P1)
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const AccountPage = lazy(() => import('./pages/account/AccountPage'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
// Admin is its own chunk: shoppers never download it
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminProducts = lazy(() => import('./pages/admin/ProductsPage'))
const AdminProductEdit = lazy(() => import('./pages/admin/ProductEditPage'))
const AdminCategories = lazy(() => import('./pages/admin/CategoriesPage'))
const AdminActivity = lazy(() => import('./pages/admin/ActivityPage'))

function Bootstrap({ children }) {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(fetchMe())
  }, [dispatch])
  return children
}

export default function App() {
  return (
    <Provider store={store}>
      <HelmetProvider>
        <BrowserRouter>
          <Bootstrap>
            <Suspense fallback={<div className="min-h-dvh bg-ground" />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/collections/:slug?" element={<CollectionPage />} />
              <Route path="/products/:slug" element={<ProductPage />} />
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route path="/account" element={<AccountPage />} />
              </Route>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/products" replace />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductEdit key="new" />} />
                <Route path="products/:id" element={<AdminProductEdit />} />
                <Route path="collections" element={<AdminCategories />} />
                <Route path="activity" element={<AdminActivity />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
          </Bootstrap>
        </BrowserRouter>
      </HelmetProvider>
    </Provider>
  )
}
