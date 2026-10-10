export function Feedback() {
  return `<div class="pd-overlay" id="pdOverlay" role="dialog" aria-modal="true" aria-labelledby="pdName" aria-hidden="true">
    <div class="pd-modal">
      <button class="pd-close" id="pdClose" type="button" aria-label="Cerrar detalle del producto">&times;</button>
      <div class="pd-gallery">
        <button class="pd-main" id="pdMain" type="button" aria-label="Ampliar foto"><img id="pdImage" src="" alt="" referrerpolicy="no-referrer"></button>
        <div class="pd-thumbs" id="pdThumbs" hidden><button type="button" class="pd-thumb is-active" data-pd-index="0" aria-label="Ver foto 1"></button><button type="button" class="pd-thumb" data-pd-index="1" aria-label="Ver foto 2"></button></div>
      </div>
      <div class="pd-info">
        <p class="pd-brand" id="pdBrand"></p>
        <h2 class="pd-name" id="pdName"></h2>
        <p class="pd-category" id="pdCategory"></p>
        <p class="pd-price" id="pdPrice"></p>
        <p class="pd-label" id="pdQtyLabel">Cantidad</p>
        <div class="pd-qty" role="group" aria-labelledby="pdQtyLabel">
          <button type="button" id="pdMinus" aria-label="Reducir cantidad">&minus;</button>
          <output id="pdQty" aria-live="polite">1</output>
          <button type="button" id="pdPlus" aria-label="Aumentar cantidad">+</button>
        </div>
        <button class="pd-add" id="pdAdd" type="button"><i class="fas fa-bag-shopping" aria-hidden="true"></i> Agregar al carrito</button>
        <button class="pd-buy" id="pdBuy" type="button">Comprar ahora</button>
      </div>
    </div>
  </div>
  <div class="zoom-overlay" id="zoomOverlay" role="dialog" aria-modal="true" aria-label="Vista ampliada" aria-hidden="true">
    <button class="zoom-close" id="zoomClose" type="button" aria-label="Cerrar vista ampliada">&times;</button><img id="zoomImage" src="" alt="Vista ampliada del producto" referrerpolicy="no-referrer"><div class="zoom-thumbs" id="zoomThumbs" hidden><button type="button" class="zoom-thumb is-active" data-zoom-index="0" aria-label="Ver foto 1"></button><button type="button" class="zoom-thumb" data-zoom-index="1" aria-label="Ver foto 2"></button></div><div class="zoom-hint">Toca fuera para cerrar</div>
  </div>
  <div class="toast-added" id="toastAdded" role="status" aria-live="polite"><i class="fas fa-check-circle" aria-hidden="true"></i> ¡Agregado al carrito!</div>
  <div class="toast-whatsapp" id="toastWhatsapp" role="status" aria-live="polite"><i class="fab fa-whatsapp" aria-hidden="true"></i> ¡Pedido enviado por WhatsApp!</div>`;
}
