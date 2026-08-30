import { storeConfig } from '../config/store.js';

// ─── iOS BODY SCROLL LOCK (prevent background scroll when cart/zoom is open) ───
(function() {
    let scrollLockCount = 0;
    let savedScrollY = 0;
    
    window.lockBodyScroll = function() {
        if (scrollLockCount === 0) {
            savedScrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = '-' + savedScrollY + 'px';
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.overflow = 'hidden';
        }
        scrollLockCount++;
    };
    
    window.unlockBodyScroll = function() {
        scrollLockCount--;
        if (scrollLockCount <= 0) {
            scrollLockCount = 0;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            window.scrollTo(0, savedScrollY);
        }
    };
})();

        // ─── CART STATE ───
        // Instagram checkout removed — now using WhatsApp
        let cart = [];

        // ─── ADD TO CART ───
        function addToCart(btn) {
            var card = btn.closest('.product-card');
            var name = card.dataset.name;
            var brand = card.dataset.brand;
            var price = parseInt(card.dataset.price);
            var priceDisplay = card.dataset.priceDisplay;
            var img = card.dataset.img;

            var existing = cart.find(function(item) { return item.name === name && item.brand === brand; });
            if (existing) {
                existing.qty++;
            } else {
                cart.push({ name, brand, price, priceDisplay, img, qty: 1 });
            }

            // Button feedback
            btn.classList.add('added');
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Agregado!';
            setTimeout(function() {
                btn.classList.remove('added');
                btn.innerHTML = '<i class="fas fa-shopping-bag"></i> Agregar al carrito';
            }, 1200);

            updateCartUI();
            showToast();
        }

        // ─── UPDATE CART UI ───
        function updateCartUI() {
            const totalItems = cart.reduce(function(sum, item) { return sum + item.qty; }, 0);
            const totalPrice = cart.reduce(function(sum, item) { return sum + (item.price * item.qty); }, 0);

            // Badge
            const badge = document.getElementById('cartBadge');
            badge.textContent = totalItems;
            badge.classList.remove('bump');
            void badge.offsetWidth; // reflow
            badge.classList.add('bump');

            // Float button
            const floatBtn = document.getElementById('cartFloat');
            if (totalItems > 0) {
                floatBtn.classList.remove('hidden');
            } else {
                floatBtn.classList.add('hidden');
            }

            // Total
            const totalDisplay = formatPrice(totalPrice);
            document.getElementById('cartTotal').textContent = totalDisplay;

            // Send button
            const sendBtn = document.getElementById('sendWhatsappBtn');
            sendBtn.disabled = cart.length === 0;

            // Render items
            renderCartItems();
        }

        function formatPrice(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        }

        // ─── RENDER CART ITEMS ───
        function renderCartItems() {
            const container = document.getElementById('cartItemsContainer');

            if (cart.length === 0) {
                container.innerHTML = `
                    <div class="cart-empty">
                        <i class="fas fa-shopping-bag"></i>
                        <p>Tu carrito está vacío<br><span style="font-size:12px;opacity:0.7">Agrega productos para comenzar</span></p>
                    </div>
                `;
                return;
            }

            let html = '';
            cart.forEach(function(item, index) {
                const itemTotal = item.price * item.qty;
                html += `
                    <div class="cart-item">
                        <div class="cart-item-img">
                            <img src="${item.img}" alt="${item.name}" referrerpolicy="no-referrer" onerror="this.dataset.imgError=1;this.style.background='linear-gradient(135deg,#fce4ec 0%,#f8bbd0 50%,#c2185b 100%)'">
                        </div>
                        <div class="cart-item-details">
                            <div class="cart-item-brand">${item.brand}</div>
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-controls">
                                <button class="qty-btn" onclick="changeQty(${index}, -1)">−</button>
                                <span class="cart-item-qty">${item.qty}</span>
                                <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                                <span class="cart-item-price">$${formatPrice(itemTotal)}</span>
                            </div>
                        </div>
                        <button class="cart-item-remove" onclick="removeItem(${index})" title="Eliminar"><i class="fas fa-times"></i></button>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        // ─── QUANTITY CONTROL ───
        function changeQty(index, delta) {
            cart[index].qty += delta;
            if (cart[index].qty <= 0) {
                cart.splice(index, 1);
            }
            updateCartUI();
        }

        // ─── REMOVE ITEM ───
        function removeItem(index) {
            cart.splice(index, 1);
            updateCartUI();
        }

        // ─── OPEN / CLOSE CART ───
        function openCart() {
            document.getElementById('cartOverlay').classList.add('open');
            document.getElementById('cartDrawer').classList.add('open');
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) lockBodyScroll();
        }

        function closeCart() {
            const wasOpen = document.getElementById('cartDrawer').classList.contains('open');
            document.getElementById('cartOverlay').classList.remove('open');
            document.getElementById('cartDrawer').classList.remove('open');
            if (wasOpen && /iPhone|iPad|iPod/i.test(navigator.userAgent)) unlockBodyScroll();
        }

        // ─── SEND TO WHATSAPP ───
        const WHATSAPP_NUMBER = storeConfig.whatsappNumber;
        let selectedPayment = '';

        function openCheckoutForm() {
            if (cart.length === 0) return;

            // Build order summary
            var totalItems = cart.reduce(function(sum, item) { return sum + item.qty; }, 0);
            var totalPrice = cart.reduce(function(sum, item) { return sum + (item.price * item.qty); }, 0);

            var summaryHtml = '<h4><i class="fas fa-shopping-bag"></i> Tu pedido (' + totalItems + ' producto' + (totalItems !== 1 ? 's' : '') + ')</h4>';
            summaryHtml += '<div class="checkout-summary-items">';
            cart.forEach(function(item) {
                var line = '♡ ' + item.brand + ' — ' + item.name;
                if (item.qty > 1) {
                    line += ' ×' + item.qty + ' ($' + item.priceDisplay + ' c/u)';
                } else {
                    line += ' $' + item.priceDisplay;
                }
                summaryHtml += '<div>' + line + '</div>';
            });
            summaryHtml += '</div>';
            summaryHtml += '<div class="checkout-summary-total"><span>Total</span><span>$' + formatPrice(totalPrice) + '</span></div>';

            document.getElementById('checkoutSummary').innerHTML = summaryHtml;

            // Reset form
            document.getElementById('checkoutNombre').value = '';
            document.getElementById('checkoutDireccion').value = '';
            document.getElementById('checkoutTelefono').value = '';
            selectedPayment = '';
            document.querySelectorAll('.checkout-payment-option').forEach(function(el) {
                el.classList.remove('selected');
            });
            document.querySelectorAll('.field-error').forEach(function(el) {
                el.classList.remove('show');
            });

            // Show overlay
            document.getElementById('checkoutOverlay').classList.add('active');
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) lockBodyScroll();
        }

        function closeCheckoutForm() {
            document.getElementById('checkoutOverlay').classList.remove('active');
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) unlockBodyScroll();
        }

        function selectPayment(el) {
            document.querySelectorAll('.checkout-payment-option').forEach(function(opt) {
                opt.classList.remove('selected');
            });
            el.classList.add('selected');
            selectedPayment = el.dataset.method;
            document.getElementById('errorPago').classList.remove('show');
        }

        function sendWhatsApp() {
            if (cart.length === 0) return;

            // Validate form
            var nombre = document.getElementById('checkoutNombre').value.trim();
            var direccion = document.getElementById('checkoutDireccion').value.trim();
            var telefono = document.getElementById('checkoutTelefono').value.trim();
            var valid = true;

            if (!nombre) {
                document.getElementById('errorNombre').classList.add('show');
                valid = false;
            } else {
                document.getElementById('errorNombre').classList.remove('show');
            }

            if (!direccion) {
                document.getElementById('errorDireccion').classList.add('show');
                valid = false;
            } else {
                document.getElementById('errorDireccion').classList.remove('show');
            }

            if (!telefono) {
                document.getElementById('errorTelefono').classList.add('show');
                valid = false;
            } else {
                document.getElementById('errorTelefono').classList.remove('show');
            }

            if (!selectedPayment) {
                document.getElementById('errorPago').classList.add('show');
                valid = false;
            }

            if (!valid) return;

            // Build WhatsApp message
            var totalItems = cart.reduce(function(sum, item) { return sum + item.qty; }, 0);
            var totalPrice = cart.reduce(function(sum, item) { return sum + (item.price * item.qty); }, 0);

            var message = '';
            message += '🛍️ *PEDIDO GLAM STUDIO* ✨\n';
            message += '━━━━━━━━━━━━━━━━━━━━\n\n';
            message += '📦 *Productos:*\n';

            cart.forEach(function(item) {
                var line = '♡ ' + item.brand + ' — ' + item.name;
                if (item.qty > 1) {
                    line += ' ×' + item.qty;
                    line += '  ($' + item.priceDisplay + ' c/u)';
                    var subtotal = item.price * item.qty;
                    line += '  = $' + formatPrice(subtotal);
                } else {
                    line += '  $' + item.priceDisplay;
                }
                message += line + '\n';
            });

            message += '\n💰 *Total: $' + formatPrice(totalPrice) + '*\n';
            message += '━━━━━━━━━━━━━━━━━━━━\n\n';
            message += '👤 *Datos del cliente:*\n';
            message += '• Nombre: ' + nombre + '\n';
            message += '• Dirección: ' + direccion + '\n';
            message += '• Teléfono: ' + telefono + '\n';
            message += '• Pago: ' + (selectedPayment === 'transferencia' ? '💳 Transferencia' : '💵 Efectivo') + '\n\n';
            message += '¡Gracias por confiar en nosotras! 💕✨';

            // Open WhatsApp
            var encodedMsg = encodeURIComponent(message);
            var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodedMsg;

            // Try opening WhatsApp
            var link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.click();

            // Show toast
            var toast = document.getElementById('toastWhatsapp');
            if (toast) {
                toast.classList.add('show');
                setTimeout(function() { toast.classList.remove('show'); }, 3000);
            }

            // Close checkout form and cart
            closeCheckoutForm();
            closeCart();
        }

        // ─── VACIAR CARRITO (admin only) ───
        function vaciarCarrito() {
            if (cart.length === 0) return;
            if (!confirm('¿Segura que quieres vaciar el carrito?')) return;
            cart = [];
            updateCartUI();
        }

        // ─── TOAST ───
        function showToast() {
            var toast = document.getElementById('toastAdded');
            toast.classList.add('show');
            setTimeout(function() { toast.classList.remove('show'); }, 1800);
        }

        // ─── ZOOM MODAL (event delegation for current & future images) ───
        const overlay = document.getElementById('zoomOverlay');
        const zoomImg = document.getElementById('zoomImage');

        document.addEventListener('click', function(e) {
            const img = e.target.closest('.product-image-wrap img');
            if (img) {
                e.stopPropagation();
                // Safari fix: if image src is a CDN URL, try blob conversion for zoom
                var zoomSrc = img.dataset.src || img.src;
                // If image src is still a placeholder, get URL from card data-img
                if (zoomSrc && zoomSrc.startsWith('data:')) {
                    var zoomCard = img.closest('.product-card');
                    zoomSrc = (zoomCard && zoomCard.dataset && zoomCard.dataset.img) || img.dataset.src;
                }
                if (zoomSrc && !zoomSrc.startsWith('blob:') && !zoomSrc.startsWith('data:')) {
                    // Try fetching as blob for Safari compatibility
                    var card = img.closest('.product-card');
                    var dataImg = card ? card.dataset.img : null;
                    var fetchUrl = dataImg || zoomSrc;
                    var sep = fetchUrl.indexOf('?') !== -1 ? '&' : '?';
                    var zoomTypedUrl = fetchUrl.indexOf('response-content-type') === -1 ?
                        fetchUrl + sep + 'response-content-type=image%2Fpng' : fetchUrl;
                    var zoomSep = zoomTypedUrl.indexOf('?') !== -1 ? '&' : '?';
                    fetch(zoomTypedUrl + zoomSep + '_z=' + Date.now(), { credentials: 'omit', cache: 'no-store' })
                        .then(function(r) { return r.ok ? r.blob() : Promise.reject(); })
                        .then(function(blob) {
                            var mime = blob.type;
                            if (!mime || mime === 'application/octet-stream') mime = 'image/png';
                            zoomImg.src = URL.createObjectURL(new Blob([blob], { type: mime }));
                        })
                        .catch(function() { zoomImg.src = zoomSrc; });
                } else {
                    zoomImg.src = zoomSrc;
                }
                zoomImg.alt = img.alt;
                overlay.classList.add('active');
                if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) lockBodyScroll();
            }
        });

        function closeZoom(e) {
            if (e.target === overlay || e.target.classList.contains('zoom-close')) {
                overlay.classList.remove('active');
                if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) unlockBodyScroll();
            }
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // Close zoom if open
                if (overlay.classList.contains('active')) {
                    overlay.classList.remove('active');
                    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) unlockBodyScroll();
                }
                // Close cart if open
                if (document.getElementById('cartDrawer').classList.contains('open')) {
                    closeCart();
                }
                // Close checkout form if open
                if (document.getElementById('checkoutOverlay').classList.contains('active')) {
                    closeCheckoutForm();
                }
            }
        });

        // ─── CATEGORY NAV: SCROLL SPY (IntersectionObserver) ───
        const categoryNav = document.getElementById('categoryNav');
        const categoryMenuToggle = document.getElementById('categoryMenuToggle');
        const categoryNavLinks = document.getElementById('categoryNavLinks');

        function syncSearchBarOffset() {
            const searchBar = document.getElementById('searchBarContainer');
            if (categoryNav && searchBar) searchBar.style.top = categoryNav.offsetHeight + 'px';
        }

        function getClosedCategoryNavHeight() {
            if (window.innerWidth <= 600 && categoryMenuToggle) {
                return categoryMenuToggle.offsetHeight + 3;
            }
            return categoryNav ? categoryNav.offsetHeight : 0;
        }

        function setCategoryMenuState(open) {
            if (!categoryNav || !categoryMenuToggle) return;
            categoryNav.classList.toggle('menu-open', open);
            categoryMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            const icon = categoryMenuToggle.querySelector('.category-menu-icon');
            if (icon) {
                icon.classList.toggle('fa-bars', !open);
                icon.classList.toggle('fa-xmark', open);
            }
            requestAnimationFrame(syncSearchBarOffset);
        }

        if (categoryMenuToggle) {
            categoryMenuToggle.addEventListener('click', function() {
                setCategoryMenuState(!categoryNav.classList.contains('menu-open'));
            });
        }

        if (categoryNavLinks) {
            categoryNavLinks.addEventListener('click', function(event) {
                if (event.target.closest('.nav-btn')) setCategoryMenuState(false);
            }, true);
            categoryNavLinks.addEventListener('transitionend', syncSearchBarOffset);
        }

        document.addEventListener('click', function(event) {
            if (categoryNav && categoryNav.classList.contains('menu-open') && !categoryNav.contains(event.target)) {
                setCategoryMenuState(false);
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') setCategoryMenuState(false);
        });

        window.addEventListener('resize', function() {
            if (window.innerWidth > 600) setCategoryMenuState(false);
        });

        const navBtns = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.category-banner[id]');
        const navHeight = getClosedCategoryNavHeight();
        var searchHeight = document.getElementById('searchBarContainer') ? document.getElementById('searchBarContainer').offsetHeight : 0;
        var totalStickyHeight = navHeight + searchHeight;

        // IntersectionObserver for scroll spy (better performance on mobile)
        if ('IntersectionObserver' in window) {
            var spyObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const current = entry.target.id;
                        navBtns.forEach(function(btn) {
                            btn.classList.toggle('active', btn.dataset.target === current);
                        });
                    }
                });
            }, {
                rootMargin: `-${totalStickyHeight + 20}px 0px -50% 0px`,
                threshold: 0
            });
            sections.forEach(function(section) { spyObserver.observe(section); });
        } else {
            // Fallback for older browsers (Safari 11, etc.)
            function updateActiveNav() {
                let current = '';
                sections.forEach(function(section) {
                    const rect = section.getBoundingClientRect();
                    if (rect.top <= totalStickyHeight + 20) {
                        current = section.id;
                    }
                });
                navBtns.forEach(function(btn) {
                    btn.classList.toggle('active', btn.dataset.target === current);
                });
            }
            window.addEventListener('scroll', updateActiveNav, { passive: true });
            updateActiveNav();
        }

        // ─── SMOOTH SCROLL OFFSET (account for sticky nav) ───
        navBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                setCategoryMenuState(false);
                const target = document.getElementById(this.dataset.target);
                if (!target) return;
                const navH = getClosedCategoryNavHeight();
                var searchH = document.getElementById('searchBarContainer') ? document.getElementById('searchBarContainer').offsetHeight : 0;
                const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navH - searchH;
                // Safari-compatible smooth scroll
                if ('scrollBehavior' in document.documentElement.style) {
                    window.scrollTo({ top: targetTop, behavior: 'smooth' });
                } else {
                    // Manual smooth scroll for older Safari
                    const startY = window.pageYOffset;
                    const diff = targetTop - startY;
                    const duration = 400;
                    let start = null;
                    function step(timestamp) {
                        if (!start) start = timestamp;
                        const progress = Math.min((timestamp - start) / duration, 1);
                        window.scrollTo(0, startY + diff * progress);
                        if (progress < 1) requestAnimationFrame(step);
                    }
                    requestAnimationFrame(step);
                }
            });
        });

        // ─── SEARCH / LUPA DE BUSQUEDA ───
        (function() {
            var searchInput = document.getElementById('searchInput');
            var searchClearBtn = document.getElementById('searchClearBtn');
            var searchIcon = document.getElementById('searchIcon');
            var searchResultsInfo = document.getElementById('searchResultsInfo');
            var searchBarContainer = document.getElementById('searchBarContainer');
            var allProductCards = document.querySelectorAll('.product-card');
            var allCategoryBanners = document.querySelectorAll('.category-banner[id]');
            var allProductsSections = document.querySelectorAll('.products-section');
            var searchTimeout = null;

            // Set search bar sticky top to match nav height
            function updateSearchBarTop() {
                var navEl = document.getElementById('categoryNav');
                if (navEl && searchBarContainer) {
                    var navH = navEl.offsetHeight;
                    searchBarContainer.style.top = navH + 'px';
                }
            }
            updateSearchBarTop();
            window.addEventListener('resize', updateSearchBarTop);

            function performSearch() {
                allProductCards = document.querySelectorAll('.product-card');
                allCategoryBanners = document.querySelectorAll('.category-banner[id]');
                allProductsSections = document.querySelectorAll('.products-section');
                var query = searchInput.value.trim().toLowerCase();

                // Toggle clear button
                if (query.length > 0) {
                    searchClearBtn.classList.add('visible');
                } else {
                    searchClearBtn.classList.remove('visible');
                }

                if (query === '') {
                    // Show everything
                    allProductCards.forEach(function(card) {
                        card.classList.remove('search-hidden');
                    });
                    allCategoryBanners.forEach(function(banner) {
                        banner.classList.remove('search-hidden');
                    });
                    allProductsSections.forEach(function(section) {
                        section.classList.remove('search-hidden');
                    });
                    searchResultsInfo.classList.remove('visible');
                    searchResultsInfo.innerHTML = '';
                    return;
                }

                var totalMatches = 0;
                var categoryCounts = {};

                // Filter product cards
                allProductCards.forEach(function(card) {
                    var name = (card.dataset.name || '').toLowerCase();
                    var brand = (card.dataset.brand || '').toLowerCase();
                    var match = name.indexOf(query) !== -1 || brand.indexOf(query) !== -1;

                    if (match) {
                        card.classList.remove('search-hidden');
                        totalMatches++;
                        // Find which category this card belongs to
                        var section = card.closest('.products-section');
                        var banner = section ? section.previousElementSibling : null;
                        if (banner && banner.classList.contains('category-banner')) {
                            var catId = banner.id || 'unknown';
                            if (!categoryCounts[catId]) categoryCounts[catId] = 0;
                            categoryCounts[catId]++;
                        }
                    } else {
                        card.classList.add('search-hidden');
                    }
                });

                // Show/hide category banners and product sections based on matches
                allCategoryBanners.forEach(function(banner) {
                    var catId = banner.id;
                    var section = banner.nextElementSibling;
                    if (categoryCounts[catId] && categoryCounts[catId] > 0) {
                        banner.classList.remove('search-hidden');
                        if (section && section.classList.contains('products-section')) {
                            section.classList.remove('search-hidden');
                        }
                    } else {
                        banner.classList.add('search-hidden');
                        if (section && section.classList.contains('products-section')) {
                            section.classList.add('search-hidden');
                        }
                    }
                });

                // Show results info
                if (totalMatches === 0) {
                    searchResultsInfo.innerHTML = 'No se encontraron productos para "<span>' + escapeHtml(searchInput.value.trim()) + '</span>"';
                } else {
                    searchResultsInfo.innerHTML = 'Se encontraron <span>' + totalMatches + '</span> producto' + (totalMatches !== 1 ? 's' : '') + ' para "<span>' + escapeHtml(searchInput.value.trim()) + '</span>"';
                }
                searchResultsInfo.classList.add('visible');
            }

            function escapeHtml(text) {
                var div = document.createElement('div');
                div.appendChild(document.createTextNode(text));
                return div.innerHTML;
            }

            function clearSearch() {
                searchInput.value = '';
                searchInput.focus();
                performSearch();
            }

            // Debounced input handler
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(performSearch, 200);
            });

            // Enter key triggers immediate search
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    clearSearch();
                }
            });

            // Clear button
            searchClearBtn.addEventListener('click', function() {
                clearSearch();
            });

            // Click icon to focus input
            searchIcon.addEventListener('click', function() {
                searchInput.focus();
            });

        })();

Object.assign(window, { addToCart, changeQty, removeItem, openCart, closeCart, openCheckoutForm, closeCheckoutForm, selectPayment, sendWhatsApp, vaciarCarrito, closeZoom });
