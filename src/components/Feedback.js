export function Feedback() {
  return `<div class="zoom-overlay" id="zoomOverlay" onclick="closeZoom(event)">
    <button class="zoom-close" onclick="closeZoom(event)">&times;</button><img id="zoomImage" src="" alt="Zoom" referrerpolicy="no-referrer"><div class="zoom-hint">Toca fuera para cerrar</div>
  </div>
  <div class="toast-added" id="toastAdded"><i class="fas fa-check-circle"></i> ¡Agregado al carrito!</div>
  <div class="toast-whatsapp" id="toastWhatsapp"><i class="fab fa-whatsapp"></i> ¡Pedido enviado por WhatsApp!</div>`;
}
