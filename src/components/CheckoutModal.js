export function CheckoutModal() {
  return `<div class="checkout-overlay" id="checkoutOverlay" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle" aria-hidden="true">
    <div class="checkout-form-container">
      <div class="checkout-form-header"><h3 id="checkoutTitle">📦 Completar pedido</h3><button class="checkout-form-close" id="checkoutClose" type="button" aria-label="Cerrar formulario">&times;</button></div>
      <div class="checkout-order-summary" id="checkoutSummary"></div>
      <div class="checkout-field"><label for="checkoutNombre">Nombre completo <span class="required">*</span></label><input type="text" id="checkoutNombre" placeholder="Ej: María García" autocomplete="name"><div class="field-error" id="errorNombre">Ingresa tu nombre</div></div>
      <div class="checkout-field"><label for="checkoutDireccion">Dirección de entrega <span class="required">*</span></label><input type="text" id="checkoutDireccion" placeholder="Ej: Cra 15 #20-30, Barrio Centro" autocomplete="street-address"><div class="field-error" id="errorDireccion">Ingresa tu dirección</div></div>
      <div class="checkout-field"><label for="checkoutTelefono">Teléfono <span class="required">*</span></label><input type="tel" id="checkoutTelefono" placeholder="Ej: 310 123 4567" autocomplete="tel"><div class="field-error" id="errorTelefono">Ingresa tu teléfono</div></div>
      <fieldset class="checkout-field checkout-fieldset"><legend>Método de pago <span class="required">*</span></legend>
        <div class="checkout-payment-group">
          <button class="checkout-payment-option" data-method="transferencia" type="button"><i class="fas fa-university" aria-hidden="true"></i> Transferencia</button>
          <button class="checkout-payment-option" data-method="efectivo" type="button"><i class="fas fa-money-bill-wave" aria-hidden="true"></i> Efectivo</button>
        </div><div class="field-error" id="errorPago">Selecciona un método de pago</div>
      </fieldset>
      <button class="checkout-whatsapp-btn" id="checkoutWhatsappBtn" type="button"><i class="fab fa-whatsapp" aria-hidden="true"></i> Enviar pedido por WhatsApp</button>
      <div class="checkout-disclaimer">Al enviar, se abrirá WhatsApp con el mensaje listo para enviar 💕</div>
    </div>
  </div>`;
}
