import { LS_CUSTOM_PRODUCTS, LS_CUSTOM_CATEGORIES, LS_DELETED_PRODUCTS, LS_PRICE_OVERRIDES, lsSave, lsLoad, lsRemove, lsSaveCustomProduct, lsRemoveCustomProduct, lsSaveDeletedProduct, lsIsDeletedProduct, lsRestoreDeletedProduct, lsSavePriceOverride, lsRemovePriceOverride, lsSaveCustomCategory, formatPrice, sortGridByPrice } from '../services/storage.js';

// ─── RESTORE PERSISTED DATA (localStorage only) ───
(function restorePersistedData() {

    // Core restore logic – works with either cloud or LS data
    function applyData(data) {
        // 1. Restore deleted products
        var deletedProducts = data.deleted || [];
        if (deletedProducts.length > 0) {
            var allCards = document.querySelectorAll('.product-card');
            for (var d = 0; d < deletedProducts.length; d++) {
                var delName = deletedProducts[d];
                for (var dc = 0; dc < allCards.length; dc++) {
                    if (allCards[dc].dataset.name === delName) {
                        allCards[dc].remove();
                        break;
                    }
                }
            }
        }

        // 2. Restore price overrides
        var priceOverrides = data.prices || {};
        var priceKeys = (function() {
            var keys = [];
            for (var k in priceOverrides) { if (priceOverrides.hasOwnProperty(k)) keys.push(k); }
            return keys;
        })();
        for (var pk = 0; pk < priceKeys.length; pk++) {
            var pName = priceKeys[pk];
            var pOverride = priceOverrides[pName];
            if (!pOverride || !pOverride.price) continue;
            var pCard = document.querySelector('.product-card[data-name="' + pName.replace(/"/g, '\\"') + '"]');
            if (pCard) {
                pCard.dataset.price = pOverride.price.toString();
                pCard.dataset.priceDisplay = pOverride.priceDisplay;
                var priceDiv = pCard.querySelector('.product-price');
                if (priceDiv) priceDiv.textContent = pOverride.priceDisplay;
            }
        }

        // 3. Restore custom categories
        var customCategories = data.categories || [];
        for (var ci = 0; ci < customCategories.length; ci++) {
            var cat = customCategories[ci];
            if (document.getElementById(cat.id)) continue;

            var nav = document.getElementById('categoryNav');
            if (nav) {
                var navLinks = document.getElementById('categoryNavLinks') || nav;
                var divider = document.createElement('div');
                divider.className = 'nav-divider';
                var navBtn = document.createElement('a');
                navBtn.className = 'nav-btn';
                navBtn.href = '#' + cat.id;
                navBtn.dataset.target = cat.id;
                navBtn.innerHTML = '<i class="fas ' + cat.icon + '"></i> ' + cat.name;
                navLinks.appendChild(divider);
                navLinks.appendChild(navBtn);
                (function(btnEl) {
                    btnEl.addEventListener('click', function(e) {
                        e.preventDefault();
                        var target = document.getElementById(btnEl.dataset.target);
                        if (target) {
                            var nH = document.getElementById('categoryNav') ? document.getElementById('categoryNav').offsetHeight : 0;
                            var sH = document.getElementById('searchBarContainer') ? document.getElementById('searchBarContainer').offsetHeight : 0;
                            window.scrollTo({ top: target.offsetTop - nH - sH - 20, behavior: 'smooth' });
                        }
                    });
                })(navBtn);
            }

            var footer = document.querySelector('.footer');
            if (footer) {
                var banner = document.createElement('div');
                banner.className = 'category-banner';
                banner.id = cat.id;
                banner.style.marginTop = '0';
                var bannerHTML = '<h2><i class="fas ' + cat.icon + '"></i> ' + cat.name + '</h2>';
                if (cat.subtitle) bannerHTML += '<p>' + cat.subtitle + '</p>';
                banner.innerHTML = bannerHTML;
                footer.parentNode.insertBefore(banner, footer);

                var section = document.createElement('div');
                section.className = 'products-section';
                var grid = document.createElement('div');
                grid.className = 'products-grid';
                grid.id = cat.id + 'Grid';
                section.appendChild(grid);
                footer.parentNode.insertBefore(section, footer);
            }

            var select = document.getElementById('newProductCategory');
            if (select) {
                var opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                select.appendChild(opt);
            }
        }

        // 4. Restore custom products
        var customProducts = data.products || [];
        for (var pi2 = 0; pi2 < customProducts.length; pi2++) {
            var prod = customProducts[pi2];
            var existing = document.querySelector('.product-card[data-name="' + prod.name.replace(/"/g, '\\"') + '"]');
            if (existing) continue;

            var priceDisplay = prod.priceDisplay || formatPrice(prod.price);
            var safeName = prod.name.replace(/"/g, '&quot;');
            var safeBrand = prod.brand.replace(/"/g, '&quot;');

            var cardHTML = '<div class="product-card" data-name="' + safeName + '" data-brand="' + safeBrand + '" data-price="' + prod.price + '" data-price-display="' + priceDisplay + '" data-img="' + prod.img + '">';
            cardHTML += '  <div class="product-image-wrap">';
            cardHTML += '    <img src="' + prod.img + '" alt="' + safeName + ' ' + safeBrand + '" onerror="this.dataset.imgError=1;this.style.background=\'linear-gradient(135deg,#fce4ec 0%,#f8bbd0 50%,#c2185b 100%)\'" referrerpolicy="no-referrer" class="product-lazy-img">';
            cardHTML += '  </div>';
            cardHTML += '  <div class="product-info">';
            cardHTML += '    <div class="product-brand">' + prod.brand + '</div>';
            cardHTML += '    <div class="product-name">' + prod.name + '</div>';
            cardHTML += '    <div class="product-price">' + priceDisplay + '</div>';
            cardHTML += '    <button class="add-cart-btn" onclick="addToCart(this)"><i class="fas fa-shopping-bag"></i> Agregar al carrito</button>';
            cardHTML += '  </div>';
            cardHTML += '</div>';

            var targetSection = null;
            var sections = document.querySelectorAll('.products-section');
            for (var si = 0; si < sections.length; si++) {
                var prev = sections[si].previousElementSibling;
                while (prev) {
                    if (prev.classList && prev.classList.contains('category-banner') && prev.id === prod.category) {
                        targetSection = sections[si];
                        break;
                    }
                    prev = prev.previousElementSibling;
                }
                if (targetSection) break;
            }
            if (!targetSection && sections.length > 0) {
                targetSection = sections[sections.length - 1];
            }

            if (targetSection) {
                var tGrid = targetSection.querySelector('.products-grid') || targetSection;
                var tDiv = document.createElement('div');
                tDiv.innerHTML = cardHTML;
                tGrid.appendChild(tDiv.firstElementChild);
            }
        }

        // 5. Sort all grids by price
        var allGrids = document.querySelectorAll('.products-grid');
        for (var gi = 0; gi < allGrids.length; gi++) {
            sortGridByPrice(allGrids[gi]);
        }

        // 6. Re-setup scroll spy
        if ('IntersectionObserver' in window) {
            var banners = document.querySelectorAll('.category-banner');
            var spyObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var current = entry.target.id;
                        document.querySelectorAll('.nav-btn').forEach(function(btn) {
                            btn.classList.toggle('active', btn.dataset.target === current);
                        });
                    }
                });
            }, { rootMargin: '-100px 0px -50% 0px', threshold: 0 });
            for (var bi2 = 0; bi2 < banners.length; bi2++) {
                spyObserver.observe(banners[bi2]);
            }
        }
    }

    // Read from localStorage (synchronous, immediate)
    var lsData = {
        products: lsLoad(LS_CUSTOM_PRODUCTS) || [],
        categories: lsLoad(LS_CUSTOM_CATEGORIES) || [],
        deleted: lsLoad(LS_DELETED_PRODUCTS) || [],
        prices: lsLoad(LS_PRICE_OVERRIDES) || {}
    };

    // Apply localStorage data immediately
    applyData(lsData);
})();

// ═══════════════════════════════════════════════════════════════
// GLAM STUDIO — ADMIN PANEL (Hidden Price Editor)
// ═══════════════════════════════════════════════════════════════
(function() {
    'use strict';

    // ─── STATE ───
    var adminOriginalPrices = {}; // { productName: { price, priceDisplay } }
    var adminCategoryMap = {};
    var adminCurrentCat = 'all';
    var adminEventsBound = false;

    // ─── ADMIN PANEL ───
    function openAdminPanel() {
        // Show vaciar carrito button (admin only)
        var vaciarBtn = document.getElementById('vaciarCarritoBtn');
        if (vaciarBtn) vaciarBtn.style.display = 'block';
        // Store original prices
        storeOriginalPrices();
        // Build category map
        buildCategoryMap();
        // Render product list
        renderAdminProducts();
        // Add admin tabs for custom categories (persisted via localStorage)
        var customCats = lsLoad(LS_CUSTOM_CATEGORIES) || [];
        var adminTabs = document.getElementById('adminCatTabs');
        if (adminTabs) {
            for (var cti = 0; cti < customCats.length; cti++) {
                var existingTab = adminTabs.querySelector('[data-cat="' + customCats[cti].id + '"]');
                if (!existingTab) {
                    var cTab = document.createElement('button');
                    cTab.className = 'admin-cat-tab';
                    cTab.dataset.cat = customCats[cti].id;
                    cTab.textContent = customCats[cti].name;
                    adminTabs.appendChild(cTab);
                    (function(tabEl, catId) {
                        tabEl.addEventListener('click', function() {
                            var tabs = document.querySelectorAll('#adminCatTabs .admin-cat-tab');
                            for (var tk = 0; tk < tabs.length; tk++) tabs[tk].classList.remove('active');
                            tabEl.classList.add('active');
                            adminCurrentCat = catId;
                            renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);
                        });
                    })(cTab, customCats[cti].id);
                }
            }
        }
        // Setup event listeners
        if (!adminEventsBound) {
            setupAdminEvents();
            adminEventsBound = true;
        }
        // Show panel
        document.getElementById('adminPanelOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    window.openAdminPanel = openAdminPanel;

    window.closeAdminPanel = function() {
        document.getElementById('adminPanelOverlay').classList.remove('active');
        document.body.style.overflow = '';
        // Hide vaciar carrito button
        var vaciarBtn = document.getElementById('vaciarCarritoBtn');
        if (vaciarBtn) vaciarBtn.style.display = 'none';
    };

    function storeOriginalPrices() {
        var cards = document.querySelectorAll('.product-card');
        adminOriginalPrices = {};
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var name = card.dataset.name;
            adminOriginalPrices[name] = {
                price: card.dataset.price,
                priceDisplay: card.dataset.priceDisplay
            };
        }
    }

    function buildCategoryMap() {
        adminCategoryMap = {};
        var sections = document.querySelectorAll('.products-section');
        for (var s = 0; s < sections.length; s++) {
            var section = sections[s];
            // Dynamically determine category from preceding banner
            var prev = section.previousElementSibling;
            var cat = 'other';
            while (prev) {
                if (prev.classList && prev.classList.contains('category-banner') && prev.id) {
                    cat = prev.id;
                    break;
                }
                prev = prev.previousElementSibling;
            }
            var cards = section.querySelectorAll('.product-card');
            for (var c = 0; c < cards.length; c++) {
                adminCategoryMap[cards[c].dataset.name] = cat;
            }
        }
    }

    function formatPrice(num) {
        // Format number with dots as thousands separators (COP style)
        var str = Math.round(num).toString();
        var parts = [];
        while (str.length > 3) {
            parts.unshift(str.slice(-3));
            str = str.slice(0, -3);
        }
        parts.unshift(str);
        return parts.join('.');
    }

    function sortGridByPrice(gridEl) {
        var cards = [];
        var children = gridEl.children;
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList && children[i].classList.contains('product-card')) {
                cards.push(children[i]);
            }
        }
        cards.sort(function(a, b) {
            return parseInt(a.getAttribute('data-price'), 10) - parseInt(b.getAttribute('data-price'), 10);
        });
        for (var j = 0; j < cards.length; j++) {
            gridEl.appendChild(cards[j]);
        }
    }

    function parseFormattedPrice(str) {
        // Remove dots and parse as integer
        return parseInt(str.replace(/\./g, ''), 10) || 0;
    }

    function renderAdminProducts(filter, search) {
        filter = filter || adminCurrentCat;
        search = (search || '').toLowerCase().trim();

        var list = document.getElementById('adminProductList');
        var cards = document.querySelectorAll('.product-card');
        var html = '';
        var count = 0;

        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var name = card.dataset.name;
            var brand = card.dataset.brand || '';
            var cat = adminCategoryMap[name] || 'other';
            var price = parseInt(card.dataset.price, 10);
            var img = card.dataset.img || '';
            var originalPrice = adminOriginalPrices[name] ? parseInt(adminOriginalPrices[name].price, 10) : price;
            var isModified = price !== originalPrice;

            // Filter by category
            if (filter !== 'all' && cat !== filter) continue;

            // Filter by search
            if (search && name.toLowerCase().indexOf(search) === -1 && brand.toLowerCase().indexOf(search) === -1) continue;

            count++;
            html += '<div class="admin-product-row' + (isModified ? ' modified' : '') + '" data-name="' + name.replace(/"/g, '&quot;') + '">';
            html += '  <img class="admin-product-img" src="' + img + '" alt="" onerror="this.style.background=\'linear-gradient(135deg,#fce4ec,#c2185b)\'" referrerpolicy="no-referrer">';
            html += '  <div class="admin-product-info">';
            html += '    <div class="admin-product-name">' + name + '</div>';
            html += '    <div class="admin-product-brand">' + brand + '</div>';
            html += '  </div>';
            html += '  <div class="admin-product-price-wrap">';
            html += '    <span class="dollar-sign">$</span>';
            html += '    <input type="number" class="admin-price-input" data-name="' + name.replace(/"/g, '&quot;') + '" value="' + price + '" min="0" step="100">';
            if (isModified) {
                html += '    <span class="admin-original-price">$' + formatPrice(originalPrice) + '</span>';
            }
            html += '  </div>';
            html += '  <button class="admin-delete-product-btn" data-name="' + name.replace(/"/g, '&quot;') + '" title="Quitar del catálogo"><i class="fas fa-trash-alt"></i></button>';
            html += '</div>';
        }

        list.innerHTML = html;
        document.getElementById('adminCounter').textContent = count + ' producto' + (count !== 1 ? 's' : '');

        // Listen for input changes
        var inputs = list.querySelectorAll('.admin-price-input');
        for (var j = 0; j < inputs.length; j++) {
            inputs[j].addEventListener('change', function() {
                var row = this.closest('.admin-product-row');
                var val = parseInt(this.value, 10);
                if (isNaN(val) || val < 0) {
                    var fallback = adminOriginalPrices[this.dataset.name] ? parseInt(adminOriginalPrices[this.dataset.name].price, 10) : 0;
                    this.value = isNaN(fallback) ? '' : fallback;
                    return;
                }
                var name = this.dataset.name;
                var origPrice = adminOriginalPrices[name] ? parseInt(adminOriginalPrices[name].price, 10) : val;
                if (val !== origPrice) {
                    row.classList.add('modified');
                    // Add or update original price label
                    var existing = row.querySelector('.admin-original-price');
                    if (!existing) {
                        var span = document.createElement('span');
                        span.className = 'admin-original-price';
                        span.textContent = '$' + formatPrice(origPrice);
                        row.querySelector('.admin-product-price-wrap').appendChild(span);
                    }
                } else {
                    row.classList.remove('modified');
                    var orig = row.querySelector('.admin-original-price');
                    if (orig) orig.remove();
                }
            });
        }
    }

    function setupAdminEvents() {
        // Category tabs
        var tabs = document.querySelectorAll('#adminCatTabs .admin-cat-tab');
        for (var t = 0; t < tabs.length; t++) {
            tabs[t].addEventListener('click', function() {
                // Remove active from all
                for (var k = 0; k < tabs.length; k++) tabs[k].classList.remove('active');
                this.classList.add('active');
                adminCurrentCat = this.dataset.cat;
                renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);
            });
        }

        // Search
        document.getElementById('adminSearchInput').addEventListener('input', function() {
            renderAdminProducts(adminCurrentCat, this.value);
        });

        // Bulk multiplier display
        document.getElementById('adminBulkMultiplier').addEventListener('input', function() {
            document.getElementById('adminBulkDisplay').textContent = this.value;
        });

        // Delete product buttons (event delegation)
        document.getElementById('adminProductList').addEventListener('click', function(e) {
            var btn = e.target.closest('.admin-delete-product-btn');
            if (!btn) return;
            var name = btn.dataset.name;
            if (!name) return;
            var card = document.querySelector('.product-card[data-name="' + name.replace(/"/g, '\\"') + '"]');
            if (card) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(function() {
                    card.remove();
                    renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);
                    // Persist deletion
                    lsRemoveCustomProduct(name);
                    lsSaveDeletedProduct(name);
                    adminToast('Producto quitado del catálogo ✓');
                }, 300);
            }
        });
    }

    // ─── BULK MULTIPLY ───
    window.adminBulkMultiply = function() {
        var multiplier = parseFloat(document.getElementById('adminBulkMultiplier').value);
        if (isNaN(multiplier) || multiplier <= 0) {
            adminToast('Multiplicador inválido');
            return;
        }

        var cards = document.querySelectorAll('.product-card');
        var changed = 0;
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var name = card.dataset.name;

            // Filter by current category
            if (adminCurrentCat !== 'all') {
                var cat = adminCategoryMap[name] || 'other';
                if (cat !== adminCurrentCat) continue;
            }

            var origPrice = adminOriginalPrices[name] ? parseInt(adminOriginalPrices[name].price, 10) : parseInt(card.dataset.price, 10);
            var newPrice = Math.round(origPrice * multiplier);
            var newDisplay = formatPrice(newPrice);

            card.dataset.price = newPrice.toString();
            card.dataset.priceDisplay = newDisplay;

            var priceDiv = card.querySelector('.product-price');
            if (priceDiv) priceDiv.textContent = newDisplay;

            changed++;
        }

        renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);
        // Persist bulk price changes
        for (var bi = 0; bi < cards.length; bi++) {
            var bCard = cards[bi];
            var bName = bCard.dataset.name;
            if (adminCurrentCat !== 'all') {
                var bCat = adminCategoryMap[bName] || 'other';
                if (bCat !== adminCurrentCat) continue;
            }
            lsSavePriceOverride(bName, parseInt(bCard.dataset.price, 10), bCard.dataset.priceDisplay);
        }
        adminToast(changed + ' precios actualizados (×' + multiplier + ')');
    };

    // ─── RESET PRICES ───
    window.adminResetPrices = function() {
        var cards = document.querySelectorAll('.product-card');
        var changed = 0;
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var name = card.dataset.name;
            var orig = adminOriginalPrices[name];
            if (!orig) continue;

            card.dataset.price = orig.price;
            card.dataset.priceDisplay = orig.priceDisplay;

            var priceDiv = card.querySelector('.product-price');
            if (priceDiv) priceDiv.textContent = orig.priceDisplay;

            changed++;
        }

        renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);
        // Clear all price overrides (cloud + local)
        lsRemove(LS_PRICE_OVERRIDES); lsSave(LS_DELETED_PRODUCTS, lsLoad(LS_DELETED_PRODUCTS) || []);
        adminToast(changed + ' precios restaurados');
    };

    // ─── SAVE PRICES (update all product cards in the DOM) ───
    window.adminSavePrices = function() {
        // Read all inputs and update the product cards
        var inputs = document.querySelectorAll('#adminProductList .admin-price-input');
        var saved = 0;

        for (var i = 0; i < inputs.length; i++) {
            var name = inputs[i].dataset.name;
            var newPrice = parseInt(inputs[i].value, 10);
            if (isNaN(newPrice) || newPrice < 0) continue;

            var card = document.querySelector('.product-card[data-name="' + name.replace(/"/g, '\\"') + '"]');
            if (!card) continue;

            var newDisplay = formatPrice(newPrice);
            card.dataset.price = newPrice.toString();
            card.dataset.priceDisplay = newDisplay;

            var priceDiv = card.querySelector('.product-price');
            if (priceDiv) priceDiv.textContent = newDisplay;

            saved++;
        }

        renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);
        // Persist price changes to localStorage
        var priceInputs = document.querySelectorAll('#adminProductList .admin-price-input');
        for (var pi = 0; pi < priceInputs.length; pi++) {
            var pName = priceInputs[pi].dataset.name;
            var pVal = parseInt(priceInputs[pi].value, 10);
            if (!isNaN(pVal) && pVal >= 0) {
                lsSavePriceOverride(pName, pVal, formatPrice(pVal));
            }
        }
        adminToast(saved + ' precios guardados ✓');
    };

    // ─── EXPORT CATALOG DATA ───
    window.adminDownloadHTML = function() {
        window.adminSavePrices();
        var backup = {
            version: 1,
            exportedAt: new Date().toISOString(),
            customProducts: lsLoad(LS_CUSTOM_PRODUCTS) || [],
            customCategories: lsLoad(LS_CUSTOM_CATEGORIES) || [],
            deletedProducts: lsLoad(LS_DELETED_PRODUCTS) || [],
            priceOverrides: lsLoad(LS_PRICE_OVERRIDES) || {}
        };
        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'glamstudio-catalogo-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        adminToast('Respaldo exportado ✓');
    };

    // ─── TOAST ───
    function adminToast(msg) {
        var el = document.getElementById('adminToast');
        el.textContent = msg;
        el.classList.add('show');
        setTimeout(function() {
            el.classList.remove('show');
        }, 2500);
    }

    // --- ADD PRODUCT TOGGLE ---
    (function() {
        var toggle = document.getElementById('adminAddProductToggle');
        var form = document.getElementById('adminAddProductForm');
        if (toggle && form) {
            toggle.addEventListener('click', function() {
                form.classList.toggle('open');
                toggle.classList.toggle('open');
            });
        }

        // Image preview
        var imgInput = document.getElementById('newProductImg');
        var imgPreview = document.getElementById('newProductImgPreview');
        if (imgInput && imgPreview) {
            imgInput.addEventListener('input', function() {
                var url = this.value.trim();
                if (url) {
                    imgPreview.src = url;
                    imgPreview.classList.add('visible');
                    imgPreview.onerror = function() { imgPreview.classList.remove('visible'); };
                } else {
                    imgPreview.classList.remove('visible');
                }
            });
        }

        // Add product button
        var addBtn = document.getElementById('adminAddProductBtn');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                var name = document.getElementById('newProductName').value.trim();
                var brand = document.getElementById('newProductBrand').value.trim();
                var price = parseInt(document.getElementById('newProductPrice').value, 10);
                var cat = document.getElementById('newProductCategory').value;
                var img = document.getElementById('newProductImg').value.trim();

                if (!name) { adminToast('Ingresa el nombre del producto'); return; }
                if (!brand) { adminToast('Ingresa la marca'); return; }
                if (isNaN(price) || price <= 0) { adminToast('Ingresa un precio v\u00e1lido'); return; }
                if (!img) { adminToast('Ingresa la URL de la imagen'); return; }

                var priceDisplay = formatPrice(price);
                var safeName = name.replace(/"/g, '&quot;');
                var safeBrand = brand.replace(/"/g, '&quot;');

                // Build product card HTML
                var cardHtml = '<div class="product-card" data-name="' + safeName + '" data-brand="' + safeBrand + '" data-price="' + price + '" data-price-display="' + priceDisplay + '" data-img="' + img + '">';
                cardHtml += '  <div class="product-image-wrap">';
                cardHtml += '    <img src="' + img + '" alt="' + safeName + ' ' + safeBrand + '" onerror="this.dataset.imgError=1;this.style.background=\'linear-gradient(135deg,#fce4ec 0%,#f8bbd0 50%,#c2185b 100%)\'" referrerpolicy="no-referrer" class="product-lazy-img">';
                cardHtml += '  </div>';
                cardHtml += '  <div class="product-info">';
                cardHtml += '    <div class="product-brand">' + brand + '</div>';
                cardHtml += '    <div class="product-name">' + name + '</div>';
                cardHtml += '    <div class="product-price">' + priceDisplay + '</div>';
                cardHtml += '    <button class="add-cart-btn" onclick="addToCart(this)"><i class="fas fa-shopping-bag"></i> Agregar al carrito</button>';
                cardHtml += '  </div>';
                cardHtml += '</div>';

                // Find the right section to append to (dynamic: match by preceding banner ID)
                var sections = document.querySelectorAll('.products-section');
                var targetSection = null;
                for (var s = 0; s < sections.length; s++) {
                    var prev = sections[s].previousElementSibling;
                    while (prev) {
                        if (prev.classList && prev.classList.contains('category-banner') && prev.id === cat) {
                            targetSection = sections[s];
                            break;
                        }
                        prev = prev.previousElementSibling;
                    }
                    if (targetSection) break;
                }
                if (!targetSection) {
                    targetSection = sections[sections.length - 1];
                }

                if (targetSection) {
                    var grid = targetSection.querySelector('.products-grid') || targetSection;
                    var tempDiv = document.createElement('div');
                    tempDiv.innerHTML = cardHtml;
                    var newCard = tempDiv.firstElementChild;
                    grid.appendChild(newCard);

                    // Auto-sort grid by price (menor a mayor)
                    sortGridByPrice(grid);

                    // Update admin category map
                    adminCategoryMap[name] = cat;

                    // Store original price
                    adminOriginalPrices[name] = { price: price.toString(), priceDisplay: priceDisplay };
                    // Save to cloud + local
                    lsSaveCustomProduct({ name: name, brand: brand, price: price, priceDisplay: priceDisplay, img: img, category: cat });
                    // If this product was previously deleted, restore it
                    lsRestoreDeletedProduct(name);

                    // Clear form
                    document.getElementById('newProductName').value = '';
                    document.getElementById('newProductBrand').value = '';
                    document.getElementById('newProductPrice').value = '';
                    document.getElementById('newProductImg').value = '';
                    if (imgPreview) imgPreview.classList.remove('visible');

                    // Re-render admin product list
                    renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);

                    adminToast('Producto agregado al cat\u00e1logo \u2713');

                    // Close admin panel and scroll to the new product in the catalog
                    setTimeout(function() {
                        var overlay = document.getElementById('adminPanelOverlay');
                        if (overlay) overlay.classList.remove('active');
                        document.body.style.overflow = '';

                        // Scroll to new product card in the catalog
                        if (newCard) {
                            var navH = document.getElementById('categoryNav') ? document.getElementById('categoryNav').offsetHeight : 0;
                            var searchH = document.getElementById('searchBarContainer') ? document.getElementById('searchBarContainer').offsetHeight : 0;
                            var offset = navH + searchH + 20;
                            window.scrollTo({ top: newCard.offsetTop - offset, behavior: 'smooth' });

                            // Gold highlight animation on the new card
                            newCard.style.transition = 'none';
                            newCard.style.boxShadow = '0 0 30px rgba(212,168,67,0.6), 0 0 15px rgba(240,215,140,0.4)';
                            newCard.style.border = '2px solid var(--gold-light)';
                            setTimeout(function() {
                                newCard.style.transition = 'box-shadow 1.5s ease, border 1.5s ease';
                                newCard.style.boxShadow = '';
                                newCard.style.border = '';
                            }, 150);
                        }
                    }, 400);
                }
            });
        }
    })();

    // --- ADD CATEGORY TOGGLE & LOGIC ---
    (function() {
        var toggle = document.getElementById('adminAddCategoryToggle');
        var form = document.getElementById('adminAddCategoryForm');
        if (toggle && form) {
            toggle.addEventListener('click', function() {
                form.classList.toggle('open');
                toggle.classList.toggle('open');
            });
        }

        var addCatBtn = document.getElementById('adminAddCategoryBtn');
        if (addCatBtn) {
            addCatBtn.addEventListener('click', function() {
                var catId = document.getElementById('newCatId').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                var catName = document.getElementById('newCatName').value.trim();
                var catIcon = document.getElementById('newCatIcon').value.trim() || 'fa-star';
                var catSubtitle = document.getElementById('newCatSubtitle').value.trim() || '';

                if (!catId) { adminToast('Ingresa un ID para la categor\u00eda'); return; }
                if (!catName) { adminToast('Ingresa el nombre de la categor\u00eda'); return; }

                // Check if category already exists
                if (document.getElementById(catId)) {
                    adminToast('Esa categor\u00eda ya existe');
                    return;
                }

                // 1. Add nav button to category nav
                var nav = document.getElementById('categoryNav');
                if (nav) {
                    var navLinks = document.getElementById('categoryNavLinks') || nav;
                    var divider = document.createElement('div');
                    divider.className = 'nav-divider';
                    var newNavBtn = document.createElement('a');
                    newNavBtn.className = 'nav-btn';
                    newNavBtn.href = '#' + catId;
                    newNavBtn.dataset.target = catId;
                    newNavBtn.innerHTML = '<i class="fas ' + catIcon + '"></i> ' + catName;
                    navLinks.appendChild(divider);
                    navLinks.appendChild(newNavBtn);

                    // Add click handler for smooth scroll
                    newNavBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        var target = document.getElementById(this.dataset.target);
                        if (target) {
                            var navH = document.getElementById('categoryNav').offsetHeight;
                            var searchH = document.getElementById('searchBarContainer') ? document.getElementById('searchBarContainer').offsetHeight : 0;
                            var offset = navH + searchH + 20;
                            window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
                        }
                    });
                }

                // 2. Add category banner before footer
                var footer = document.querySelector('.footer');
                var banner = document.createElement('div');
                banner.className = 'category-banner';
                banner.id = catId;
                banner.style.marginTop = '0';
                var bannerH2 = '<h2><i class="fas ' + catIcon + '"></i> ' + catName + '</h2>';
                if (catSubtitle) {
                    bannerH2 += '<p>' + catSubtitle + '</p>';
                }
                banner.innerHTML = bannerH2;
                footer.parentNode.insertBefore(banner, footer);

                // 3. Add products section with empty grid before footer
                var section = document.createElement('div');
                section.className = 'products-section';
                var grid = document.createElement('div');
                grid.className = 'products-grid';
                grid.id = catId + 'Grid';
                section.appendChild(grid);
                footer.parentNode.insertBefore(section, footer);

                // 4. Add tab in admin panel
                var adminTabs = document.getElementById('adminCatTabs');
                if (adminTabs) {
                    var newTab = document.createElement('button');
                    newTab.className = 'admin-cat-tab';
                    newTab.dataset.cat = catId;
                    newTab.textContent = catName;
                    adminTabs.appendChild(newTab);

                    // Add click handler for admin tab
                    newTab.addEventListener('click', function() {
                        var tabs = document.querySelectorAll('#adminCatTabs .admin-cat-tab');
                        for (var k = 0; k < tabs.length; k++) tabs[k].classList.remove('active');
                        this.classList.add('active');
                        adminCurrentCat = this.dataset.cat;
                        renderAdminProducts(adminCurrentCat, document.getElementById('adminSearchInput').value);
                    });
                }

                // 5. Add option to product category select
                var select = document.getElementById('newProductCategory');
                if (select) {
                    var opt = document.createElement('option');
                    opt.value = catId;
                    opt.textContent = catName;
                    select.appendChild(opt);
                }

                // 6. Re-initialize scroll spy for the new section
                if ('IntersectionObserver' in window) {
                    var spyObserver = new IntersectionObserver(function(entries) {
                        entries.forEach(function(entry) {
                            if (entry.isIntersecting) {
                                var current = entry.target.id;
                                document.querySelectorAll('.nav-btn').forEach(function(btn) {
                                    btn.classList.toggle('active', btn.dataset.target === current);
                                });
                            }
                        });
                    }, { rootMargin: '-100px 0px -50% 0px', threshold: 0 });
                    spyObserver.observe(banner);
                }

                // Clear form
                document.getElementById('newCatId').value = '';
                document.getElementById('newCatName').value = '';
                document.getElementById('newCatIcon').value = 'fa-star';
                document.getElementById('newCatSubtitle').value = '';

                // Save category to cloud + local
                lsSaveCustomCategory({ id: catId, name: catName, icon: catIcon, subtitle: catSubtitle });
                adminToast('Categor\u00eda "' + catName + '" creada \u2713');

                // Scroll to new banner
                var navH2 = document.getElementById('categoryNav').offsetHeight;
                var searchH2 = document.getElementById('searchBarContainer') ? document.getElementById('searchBarContainer').offsetHeight : 0;
                setTimeout(function() {
                    window.scrollTo({ top: banner.offsetTop - navH2 - searchH2 - 20, behavior: 'smooth' });
                }, 300);
            });
        }
    })();

    // --- HIGHLIGHT NEW PRODUCT ANIMATION ---
    var highlightStyle = document.createElement('style');
    highlightStyle.textContent = '@keyframes adminHighlightNew { 0%{background:rgba(212,168,67,0.4);transform:scale(1.02)} 100%{background:rgba(255,255,255,0.04);transform:scale(1)} }';
    document.head.appendChild(highlightStyle);

    // Add shake animation keyframes dynamically
    var shakeStyle = document.createElement('style');
    shakeStyle.textContent = '@keyframes adminShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }';
    document.head.appendChild(shakeStyle);

})();

// ─── INICIO FLOAT BUTTON SCROLL LOGIC ───
(function() {
    var inicioBtn = document.getElementById('inicioFloatBtn');
    if (!inicioBtn) return;
    
    var scrollThreshold = 400;
    var ticking = false;
    
    function checkScroll() {
        if (window.scrollY > scrollThreshold) {
            inicioBtn.classList.add('visible');
        } else {
            inicioBtn.classList.remove('visible');
        }
        ticking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(checkScroll);
            ticking = true;
        }
    }, { passive: true });
    
    // Initial check
    checkScroll();
})();
