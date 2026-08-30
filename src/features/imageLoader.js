// ═══════════════════════════════════════════════════════════════
// SAFARI / iOS COMPREHENSIVE IMAGE FIX v2
// Handles: lazy loading, Content-Type issues, CORS, cache
// ═══════════════════════════════════════════════════════════════
(function() {
    var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var needsFix = isSafari || isIOS;
    var PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // ══════ LAYER 1: IntersectionObserver Lazy Loading ══════
    // Safari < 15.4 doesn't support loading="lazy" attribute.
    // We removed it and implement IO-based lazy loading manually.
    // This ALSO fixes the Safari bug where loading="lazy" images
    // sometimes don't render even after scrolling into view.
    
    var lazyObserver = null;
    var pendingLazy = [];
    
    function initLazyLoading() {
        // Safari/iOS: use IntersectionObserver lazy loading
        // (Safari < 15.4 doesn't support native loading="lazy")
        // Other browsers: images load natively via img src
        if (!needsFix) {
            // Non-Safari: mark all images as loaded immediately
            document.querySelectorAll('.product-lazy-img').forEach(function(img) {
                if (!img.dataset.loaded) {
                    img.dataset.loaded = '1';
                }
            });
            return;
        }

        // Safari/iOS: implement IntersectionObserver lazy loading
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately
            document.querySelectorAll('.product-lazy-img').forEach(loadImageNow);
            return;
        }
        
        lazyObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    loadImageNow(entry.target);
                    lazyObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '300px', threshold: 0.01 });
        
        document.querySelectorAll('.product-lazy-img').forEach(function(img) {
            if (!img.dataset.loaded) {
                // Store original src to data-src
                if (img.src && !img.src.startsWith('data:')) {
                    img.dataset.src = img.src;
                    img.src = PLACEHOLDER;
                }
                lazyObserver.observe(img);
            }
        });
    }
    
    function loadImageNow(img) {
        var src = img.dataset.src || img.src;
        if (!src || src.startsWith('data:')) return;
        
        img.dataset.loaded = '0'; // Loading...
        
        if (needsFix) {
            // Safari/iOS: try blob conversion first
            convertImageToBlob(img, src);
        } else {
            // Other browsers: just set src directly
            img.src = src;
            img.dataset.loaded = '1';
        }
    }
    
    // ══════ LAYER 2: Blob Conversion for Safari/iOS ══════
    // Safari may refuse to render images when CDN returns
    // Content-Type: application/octet-stream. By fetching
    // the image as a blob and creating an object URL with
    // the correct MIME type, we bypass this restriction.
    
    function convertImageToBlob(img, src) {
        if (img.dataset.blobAttempt) return;
        img.dataset.blobAttempt = '1';
        
        var card = img.closest('.product-card');
        src = src || (card && card.dataset.img) || img.dataset.src || null;
        if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
            img.dataset.loaded = '1';
            return;
        }

        // ── Safari/iOS Content-Type fix ──
        // CDNs may return Content-Type: application/octet-stream
        // which Safari silently refuses to render.
        // Adding ?response-content-type=image%2Fpng forces correct MIME
        if (src.indexOf('response-content-type') === -1) {
            var sep = src.indexOf('?') !== -1 ? '&' : '?';
            var typedSrc = src + sep + 'response-content-type=image%2Fpng';
            img.onload = function() { img.dataset.loaded = '1'; };
            img.onerror = function() {
                // Typed URL failed, try blob conversion
                tryBlobConversion(img, src);
            };
            img.src = typedSrc;
            return;
        }

        // Already has response-content-type, try blob conversion
        tryBlobConversion(img, src);
    }

    function tryBlobConversion(img, src) {
        // Add cache buster
        var sep = src.indexOf('?') !== -1 ? '&' : '?';
        var bustSrc = src + sep + '_b=' + Date.now();

        // Attempt 1: fetch (default mode - no forced CORS)
        fetch(bustSrc, { credentials: 'omit', cache: 'no-store' })
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.blob();
            })
            .then(function(blob) {
                var mime = blob.type;
                if (!mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
                    mime = 'image/png';
                }
                var typedBlob = new Blob([blob], { type: mime });
                var url = URL.createObjectURL(typedBlob);
                img.onload = function() { 
                    img.dataset.loaded = '1';
                    URL.revokeObjectURL(url);
                };
                img.onerror = function() {
                    // Blob URL also failed? Try direct src
                    img.src = src;
                    img.dataset.loaded = '1';
                };
                img.src = url;
            })
            .catch(function() {
                // CORS failed. Try XHR (might work if CDN sends partial CORS)
                tryXHR(img, bustSrc, src);
            });
    }
    
    function tryXHR(img, bustSrc, fallbackSrc) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', bustSrc, true);
            xhr.responseType = 'blob';
            xhr.timeout = 8000;
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var blob = xhr.response;
                    var mime = blob.type || 'image/png';
                    if (mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
                        mime = 'image/png';
                    }
                    var typedBlob = new Blob([blob], { type: mime });
                    img.onload = function() { img.dataset.loaded = '1'; };
                    img.src = URL.createObjectURL(typedBlob);
                } else {
                    directLoad(img, fallbackSrc);
                }
            };
            xhr.ontimeout = function() { directLoad(img, fallbackSrc); };
            xhr.onerror = function() { directLoad(img, fallbackSrc); };
            xhr.send();
        } catch(e) {
            directLoad(img, fallbackSrc);
        }
    }
    
    function directLoad(img, src) {
        // Last resort: just load directly via img src
        // This might show blank in Safari if Content-Type is wrong,
        // but it's the only option if CORS fails
        img.src = src;
        img.dataset.loaded = '1';
        
        // One more trick: force a repaint after a delay
        setTimeout(function() {
            if (img.naturalWidth === 0) {
                // Safari loaded but didn't render - try adding to a canvas
                // and converting to data URL
                tryCanvasConversion(img);
            }
        }, 1000);
    }
    
    // ══════ LAYER 3: Canvas Conversion (last resort) ══════
    // If the image loaded (naturalWidth > 0) but Safari won't
    // display it, we can try drawing to a canvas and using
    // the data URL. NOTE: This only works if CORS headers are
    // present on the CDN, otherwise canvas is tainted.
    
    function tryCanvasConversion(img) {
        if (img.naturalWidth === 0 || !img.complete) return;
        try {
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var dataUrl = canvas.toDataURL('image/png');
            img.src = dataUrl;
            img.dataset.loaded = '1';
        } catch(e) {
            // Canvas tainted (CORS not supported by CDN)
            // Nothing more we can do client-side
            console.warn('GlamStudio: Cannot convert image via canvas (CORS). Image may not display in Safari.');
        }
    }
    
    // ══════ LAYER 4: Post-Load Check ══════
    // After page loads, check all images and retry failures
    
    function checkAllImages() {
        document.querySelectorAll('.product-lazy-img').forEach(function(img) {
            if (img.complete && img.naturalWidth === 0) {
                // Image failed to load - retry with blob
                var src = img.dataset.src || (function() { var c = img.closest('.product-card'); return c && c.dataset && c.dataset.img; })();
                if (src && !img.dataset.blobAttempt) {
                    convertImageToBlob(img, src);
                }
            }
        });
    }
    
    // ══════ INITIALIZATION ══════
    function init() {
        initLazyLoading();

        // ─── SAFETY NET: Force all images visible after 5s ───
        setTimeout(function() {
            var allImgs = document.querySelectorAll('.product-lazy-img:not([data-loaded="1"])');
            for (var i = 0; i < allImgs.length; i++) {
                allImgs[i].setAttribute('data-loaded', '1');
                // If src is still placeholder, try data-src
                var img = allImgs[i];
                if (img.src && img.src.startsWith('data:') && img.dataset.src) {
                    img.src = img.dataset.src;
                }
            }
            if (allImgs.length > 0) {
                console.log('[Glam Safety Net] Forced ' + allImgs.length + ' images visible');
            }
        }, 5000);

        
        // Post-load checks
        window.addEventListener('load', function() {
            setTimeout(checkAllImages, 2000);
            setTimeout(checkAllImages, 5000);
            setTimeout(checkAllImages, 10000);
        });
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ══════ MUTATION OBSERVER: watch for dynamically added images ══════
    if ('MutationObserver' in window) {
        var imgObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
                for (var i = 0; i < m.addedNodes.length; i++) {
                    var node = m.addedNodes[i];
                    if (node.nodeType !== 1) continue;
                    var imgs = node.querySelectorAll ? 
                        node.querySelectorAll('.product-lazy-img') : [];
                    for (var j = 0; j < imgs.length; j++) {
                        if (lazyObserver && !imgs[j].dataset.loaded) {
                            lazyObserver.observe(imgs[j]);
                        }
                    }
                    if (node.classList && node.classList.contains('product-lazy-img')) {
                        if (lazyObserver && !node.dataset.loaded) {
                            lazyObserver.observe(node);
                        }
                    }
                }
            });
        });
        
        var observeBody = function() {
            if (document.body) {
                imgObserver.observe(document.body, { childList: true, subtree: true });
            }
        };
        
        if (document.body) observeBody();
        else document.addEventListener('DOMContentLoaded', observeBody);
    }
})();
