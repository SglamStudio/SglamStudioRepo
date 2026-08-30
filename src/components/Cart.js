export function Cart() {
  return `<button class="inicio-float-btn" id="inicioFloatBtn" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Inicio">
    <i class="fas fa-chevron-up"></i><span>Inicio</span>
  </button>
  <button class="cart-float hidden" id="cartFloat" onclick="openCart()">
    <i class="fas fa-shopping-bag"></i><span class="cart-badge" id="cartBadge">0</span>
  </button>
  <div class="cart-overlay" id="cartOverlay" onclick="closeCart()"></div>
  <aside class="cart-drawer" id="cartDrawer">
    <div class="cart-drawer-header">
      <div class="cart-drawer-title"><i class="fas fa-shopping-bag"></i> Mi Carrito</div>
      <button class="cart-drawer-close" onclick="closeCart()">&times;</button>
    </div>
    <div class="cart-items-container" id="cartItemsContainer"></div>
    <div class="cart-drawer-footer">
      <div class="cart-total-row"><span class="cart-total-label">Total del pedido</span><span class="cart-total-value" id="cartTotal">0</span></div>
      <button class="send-whatsapp-btn" id="sendWhatsappBtn" onclick="openCheckoutForm()"><i class="fab fa-whatsapp"></i> Enviar pedido por WhatsApp</button>
      <button class="vaciar-carrito-btn" id="vaciarCarritoBtn" onclick="vaciarCarrito()"><i class="fas fa-trash-alt"></i> Vaciar carrito</button>
    </div>
  </aside>`;
}
