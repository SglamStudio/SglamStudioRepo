export function AdminPanel() {
  return `<div class="admin-panel-overlay" id="adminPanelOverlay" role="dialog" aria-modal="true" aria-labelledby="adminPanelTitle" aria-hidden="true">
    <div class="admin-panel">
      <div class="admin-panel-header">
        <h2 id="adminPanelTitle" tabindex="-1"><i class="fas fa-gem icon-gap-8 icon-font-poppins" aria-hidden="true"></i> Administrar catálogo</h2>
        <div class="admin-header-actions">
          <button class="admin-device-btn" id="adminLogoutBtn" type="button"><i class="fas fa-sign-out-alt" aria-hidden="true"></i> Cerrar sesión</button>
          <button class="admin-close-btn" id="adminCloseBtn" type="button"><i class="fas fa-times icon-gap-6" aria-hidden="true"></i>Cerrar</button>
        </div>
      </div>
      <div class="admin-api-status" id="adminApiStatus" role="status" aria-live="polite"></div>

      <section class="admin-device-section" aria-labelledby="deviceSectionTitle">
        <div class="admin-device-section-heading">
          <div><h3 id="deviceSectionTitle">Dispositivos autorizados</h3><p>Autoriza otro celular o computador con un enlace de un solo uso que vence pronto.</p></div>
          <button class="admin-device-btn" id="adminCreateInviteBtn" type="button"><i class="fas fa-link" aria-hidden="true"></i> Crear enlace</button>
        </div>
        <div class="admin-invite-form" id="adminInviteForm" hidden>
          <label for="adminInviteLabel">Nombre del dispositivo</label>
          <div class="admin-invite-row"><input id="adminInviteLabel" type="text" maxlength="120" placeholder="Ej: Celular de Mateo"><button class="admin-save-btn" id="adminConfirmInviteBtn" type="button">Generar</button></div>
        </div>
        <div class="admin-invite-result" id="adminInviteResult" role="status" aria-live="polite"></div>
        <div class="admin-devices-list" id="adminDevicesList"><span class="admin-muted">Cargando dispositivos…</span></div>
      </section>

      <nav class="admin-cat-tabs" id="adminCatTabs" aria-label="Filtrar productos por categoría"></nav>
      <div class="admin-bulk">
        <label for="adminBulkMultiplier">Multiplicar precios visibles por:</label>
        <input type="number" id="adminBulkMultiplier" value="2" step="0.1" min="0.1" max="100">
        <button class="admin-bulk-btn" id="adminBulkBtn" type="button">Aplicar ×<span id="adminBulkDisplay">2</span></button>
        <button class="admin-bulk-btn admin-reset-btn" id="adminResetBtn" type="button"><i class="fas fa-rotate-left icon-gap-4" aria-hidden="true"></i>Restaurar visibles</button>
      </div>
      <p class="admin-scope-note" id="adminScopeNote">Las acciones masivas afectan solo los productos visibles del filtro actual.</p>

      <div class="admin-search"><div class="admin-search-wrap"><i class="fas fa-search" aria-hidden="true"></i><label class="sr-only" for="adminSearchInput">Buscar productos</label><input type="search" id="adminSearchInput" placeholder="Buscar producto o marca…" autocomplete="off"></div></div>

      <section class="admin-add-section">
        <button class="admin-add-toggle" id="adminAddProductToggle" type="button" aria-expanded="false" aria-controls="adminProductForm"><i class="fas fa-plus-circle" aria-hidden="true"></i> <span id="adminProductFormHeading">Agregar producto</span></button>
        <form class="admin-add-form" id="adminProductForm" novalidate>
          <input type="hidden" id="adminProductId">
          <div class="admin-add-row">
            <div class="admin-add-field"><label for="adminProductName">Nombre interno</label><input type="text" id="adminProductName" maxlength="220" required></div>
            <div class="admin-add-field"><label for="adminProductDisplayName">Nombre visible</label><input type="text" id="adminProductDisplayName" maxlength="220" required></div>
          </div>
          <div class="admin-add-row">
            <div class="admin-add-field"><label for="adminProductBrand">Marca</label><input type="text" id="adminProductBrand" maxlength="160" required></div>
            <div class="admin-add-field"><label for="adminProductCategory">Categoría</label><select id="adminProductCategory" required></select></div>
            <div class="admin-add-field"><label for="adminProductPrice">Precio (COP)</label><input type="number" id="adminProductPrice" min="0" max="100000000" step="100" required></div>
          </div>
          <div class="admin-add-row"><div class="admin-add-field"><label for="adminProductImage">URL HTTPS de imagen</label><input type="url" id="adminProductImage" placeholder="https://…" required><img class="img-preview" id="adminProductImgPreview" alt="Vista previa de la imagen"></div></div>
          <div class="admin-form-actions"><button class="admin-add-submit" id="adminProductSubmit" type="submit"><i class="fas fa-check" aria-hidden="true"></i> Guardar producto</button><button class="admin-download-btn" id="adminProductCancel" type="button" hidden>Cancelar edición</button></div>
        </form>
      </section>

      <section class="admin-add-section">
        <button class="admin-add-toggle" id="adminAddCategoryToggle" type="button" aria-expanded="false" aria-controls="adminCategoryForm"><i class="fas fa-folder-plus" aria-hidden="true"></i> <span id="adminCategoryFormHeading">Agregar categoría</span></button>
        <form class="admin-add-form" id="adminCategoryForm" novalidate>
          <input type="hidden" id="adminCategoryId">
          <div class="admin-cat-add-row">
            <div class="admin-add-field"><label for="adminCategorySlug">Identificador</label><input type="text" id="adminCategorySlug" pattern="[a-z0-9-]+" placeholder="skincare" required></div>
            <div class="admin-add-field"><label for="adminCategoryNavLabel">Nombre corto</label><input type="text" id="adminCategoryNavLabel" required></div>
            <div class="admin-add-field"><label for="adminCategoryAdminLabel">Nombre en admin</label><input type="text" id="adminCategoryAdminLabel" required></div>
            <div class="admin-add-field"><label for="adminCategoryIcon">Icono Font Awesome</label><input type="text" id="adminCategoryIcon" value="fa-star"></div>
          </div>
          <div class="admin-cat-add-row">
            <div class="admin-add-field"><label for="adminCategoryTitle">Título</label><input type="text" id="adminCategoryTitle" required></div>
            <div class="admin-add-field"><label for="adminCategorySubtitle">Subtítulo</label><input type="text" id="adminCategorySubtitle"></div>
            <div class="admin-add-field"><label for="adminCategoryOrder">Orden</label><input type="number" id="adminCategoryOrder" value="0" min="0" max="10000"></div>
          </div>
          <div class="admin-form-actions"><button class="admin-cat-add-btn" id="adminCategorySubmit" type="submit"><i class="fas fa-check" aria-hidden="true"></i> Guardar categoría</button><button class="admin-download-btn" id="adminCategoryCancel" type="button" hidden>Cancelar edición</button></div>
        </form>
      </section>

      <section class="admin-category-manager" aria-labelledby="adminCategoryManagerTitle">
        <h3 id="adminCategoryManagerTitle">Categorías</h3>
        <div id="adminCategoryList"></div>
      </section>

      <div class="admin-counter" id="adminCounter">0 productos</div>
      <div id="adminProductList" aria-live="polite"></div>
      <div class="admin-bottom-bar">
        <button class="admin-save-btn" id="adminSavePricesBtn" type="button"><i class="fas fa-check icon-gap-8" aria-hidden="true"></i><span>Guardar cambios de precio</span></button>
        <button class="admin-download-btn" id="adminExportBtn" type="button"><i class="fas fa-download icon-gap-6" aria-hidden="true"></i>Exportar catálogo</button>
        <button class="admin-download-btn" id="adminLegacyBackupBtn" type="button" hidden><i class="fas fa-archive icon-gap-6" aria-hidden="true"></i>Respaldar datos locales</button>
      </div>
    </div>
  </div>
  <div class="admin-toast" id="adminToast" role="status" aria-live="polite"><span id="adminToastMessage"></span><button id="adminToastAction" type="button" hidden></button></div>`;
}
