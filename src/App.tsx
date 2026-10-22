import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import ProductPage from './pages/ProductPage'
import CustomOrder from './pages/CustomOrder'
import NotFound from './pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Reinicia el estado (color, cantidad) al pasar de un producto a otro
function ProductRoute() {
  const { id } = useParams()
  return <ProductPage key={id} />
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <ScrollToTop />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/categoria/:slug" element={<CategoryPage />} />
            <Route path="/buscar" element={<CategoryPage search />} />
            <Route path="/producto/:id" element={<ProductRoute />} />
            <Route path="/personalizado" element={<CustomOrder />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <CartDrawer />
      </CartProvider>
    </BrowserRouter>
  )
}
