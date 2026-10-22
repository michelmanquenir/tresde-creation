import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ProductsProvider } from './context/ProductsContext'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import ProductPage from './pages/ProductPage'
import CustomOrder from './pages/CustomOrder'
import NotFound from './pages/NotFound'
import AdminLayout from './admin/AdminLayout'
import AdminProducts from './admin/AdminProducts'
import AdminProductForm from './admin/AdminProductForm'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Reinicia el estado del componente al cambiar de producto
function KeyedById({ children }: { children: (id?: string) => ReactNode }) {
  const { id } = useParams()
  return <>{children(id)}</>
}

// Diseño de la tienda pública
function StoreLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ProductsProvider>
        <CartProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<StoreLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/categoria/:slug" element={<CategoryPage />} />
              <Route path="/buscar" element={<CategoryPage search />} />
              <Route path="/producto/:id" element={<KeyedById>{(id) => <ProductPage key={id} />}</KeyedById>} />
              <Route path="/personalizado" element={<CustomOrder />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminProducts />} />
              <Route path="nuevo" element={<AdminProductForm />} />
              <Route path="editar/:id" element={<KeyedById>{(id) => <AdminProductForm key={id} />}</KeyedById>} />
            </Route>
          </Routes>
        </CartProvider>
      </ProductsProvider>
    </BrowserRouter>
  )
}
