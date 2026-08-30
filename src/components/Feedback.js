export function Feedback() {
  return `<div class="zoom-overlay" id="zoomOverlay" role="dialog" aria-modal="true" aria-label="Vista ampliada" aria-hidden="true">
    <button class="zoom-close" id="zoomClose" type="button" aria-label="Cerrar vista ampliada">&times;</button><img id="zoomImage" src="" alt="Vista ampliada del producto" referrerpolicy="no-referrer"><div class="zoom-hint">Toca fuera para cerrar</div>
  </div>
  <div class="toast-added" id="toastAdded" role="status" aria-live="polite"><i class="fas fa-check-circle" aria-hidden="true"></i> ¡Agregado al carrito!</div>
  <div class="toast-whatsapp" id="toastWhatsapp" role="status" aria-live="polite"><i class="fab fa-whatsapp" aria-hidden="true"></i> ¡Pedido enviado por WhatsApp!</div>`;
}
