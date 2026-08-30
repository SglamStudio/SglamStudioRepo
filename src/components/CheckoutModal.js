export function CheckoutModal() {
  return `<div class="checkout-overlay" id="checkoutOverlay" onclick="closeCheckoutForm()">
    <div class="checkout-form-container" onclick="event.stopPropagation()">
      <div class="checkout-form-header"><h3>📦 Completar pedido</h3><button class="checkout-form-close" onclick="closeCheckoutForm()">&times;</button></div>
      <div class="checkout-order-summary" id="checkoutSummary"></div>
      <div class="checkout-field"><label>Nombre completo <span class="required">*</span></label><input type="text" id="checkoutNombre" placeholder="Ej: María García" autocomplete="name"><div class="field-error" id="errorNombre">Ingresa tu nombre</div></div>
      <div class="checkout-field"><label>Dirección de entrega <span class="required">*</span></label><input type="text" id="checkoutDireccion" placeholder="Ej: Cra 15 #20-30, Barrio Centro" autocomplete="street-address"><div class="field-error" id="errorDireccion">Ingresa tu dirección</div></div>
      <div class="checkout-field"><label>Teléfono <span class="required">*</span></label><input type="tel" id="checkoutTelefono" placeholder="Ej: 310 123 4567" autocomplete="tel"><div class="field-error" id="errorTelefono">Ingresa tu teléfono</div></div>
      <div class="checkout-field"><label>Método de pago <span class="required">*</span></label>
        <div class="checkout-payment-group">
          <div class="checkout-payment-option" data-method="transferencia" onclick="selectPayment(this)"><i class="fas fa-university"></i> Transferencia</div>
          <div class="checkout-payment-option" data-method="efectivo" onclick="selectPayment(this)"><i class="fas fa-money-bill-wave"></i> Efectivo</div>
        </div><div class="field-error" id="errorPago">Selecciona un método de pago</div>
      </div>
      <button class="checkout-whatsapp-btn" onclick="sendWhatsApp()"><i class="fab fa-whatsapp"></i> Enviar pedido por WhatsApp</button>
      <div class="checkout-disclaimer">Al enviar, se abrirá WhatsApp con el mensaje listo para enviar 💕</div>
    </div>
  </div>`;
}
