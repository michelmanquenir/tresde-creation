import { Link } from 'react-router-dom'
import { formatPrice } from '../data/catalog'
import { useCart } from '../context/CartContext'
import Icon from './Icon'
import ProductImage from './ProductImage'

export default function CartDrawer() {
  const { items, total, isOpen, close, setQty, remove } = useCart()

  return (
    <>
      <div className={`drawer-backdrop ${isOpen ? 'show' : ''}`} onClick={close} />
      <aside className={`drawer drawer-right ${isOpen ? 'show' : ''}`} aria-hidden={!isOpen} aria-label="Carrito">
        <div className="drawer-head">
          <h2>Tu carrito</h2>
          <button className="icon-btn" onClick={close} aria-label="Cerrar carrito">
            <Icon name="close" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <Icon name="cart" size={40} />
            <p>Tu carrito está vacío.</p>
            <Link to="/categoria/todos" className="btn btn-primary" onClick={close}>
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.id + item.color} className="cart-item">
                  <div className="cart-thumb">
                    <ProductImage product={item.product} color={item.color} />
                  </div>
                  <div className="cart-info">
                    <Link to={`/producto/${item.id}`} onClick={close} className="cart-name">
                      {item.product.name}
                    </Link>
                    <span className="cart-meta">
                      <span className="swatch sm" style={{ background: item.color }} />
                      {item.product.material}
                    </span>
                    <div className="qty">
                      <button onClick={() => setQty(item.id, item.color, item.qty - 1)} aria-label="Quitar uno">
                        <Icon name="minus" size={14} />
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => setQty(item.id, item.color, item.qty + 1)} aria-label="Agregar uno">
                        <Icon name="plus" size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-right">
                    <strong>{formatPrice(item.product.price * item.qty)}</strong>
                    <button className="link-btn" onClick={() => remove(item.id, item.color)} aria-label="Eliminar">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-footer">
              <div className="cart-total">
                <span>Subtotal</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p className="muted small">Envío calculado al finalizar la compra.</p>
              <button className="btn btn-primary btn-block">Finalizar compra</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
