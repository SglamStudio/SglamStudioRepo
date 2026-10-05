export function Cart() {
  return `<button class="inicio-float-btn" id="inicioFloatBtn" type="button" title="Volver arriba" aria-label="Volver al inicio">
    <i class="fas fa-chevron-up" aria-hidden="true"></i>
  </button>
  <div class="cart-overlay" id="cartOverlay"></div>
  <aside class="cart-drawer" id="cartDrawer" aria-labelledby="cartDrawerTitle" aria-hidden="true">
    <div class="cart-drawer-header">
      <div class="cart-drawer-title" id="cartDrawerTitle"><i class="fas fa-bag-shopping" aria-hidden="true"></i> Mi carrito</div>
      <button class="cart-drawer-close" id="cartDrawerClose" type="button" aria-label="Cerrar carrito">&times;</button>
    </div>
    <div class="cart-items-container" id="cartItemsContainer"></div>
    <div class="cart-drawer-footer">
      <div class="cart-total-row"><span class="cart-total-label">Total del pedido</span><span class="cart-total-value" id="cartTotal">0</span></div>
      <button class="send-whatsapp-btn" id="sendWhatsappBtn" type="button"><i class="fab fa-whatsapp" aria-hidden="true"></i> Enviar pedido por WhatsApp</button>
      <button class="vaciar-carrito-btn" id="vaciarCarritoBtn" type="button"><i class="fas fa-trash-alt" aria-hidden="true"></i> Vaciar carrito</button>
    </div>
  </aside>`;
}
