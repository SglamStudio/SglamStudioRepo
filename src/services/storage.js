// ─── LOCALSTORAGE PERSISTENCE ───
    var LS_CUSTOM_PRODUCTS = 'glam_custom_products';
    var LS_CUSTOM_CATEGORIES = 'glam_custom_categories';
    var LS_DELETED_PRODUCTS = 'glam_deleted_products';
    var LS_PRICE_OVERRIDES = 'glam_price_overrides';

    function lsSave(key, data) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    }
    function lsLoad(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
    }
    function lsRemove(key) {
        try { localStorage.removeItem(key); } catch(e) {}
    }

    function lsSaveCustomProduct(product) {
        var arr = lsLoad(LS_CUSTOM_PRODUCTS) || [];
        var found = false;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].name === product.name) { arr[i] = product; found = true; break; }
        }
        if (!found) arr.push(product);
        lsSave(LS_CUSTOM_PRODUCTS, arr);
    }

    function lsRemoveCustomProduct(name) {
        var arr = lsLoad(LS_CUSTOM_PRODUCTS) || [];
        var newArr = [];
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].name !== name) newArr.push(arr[i]);
        }
        lsSave(LS_CUSTOM_PRODUCTS, newArr);
    }

    function lsSaveDeletedProduct(name) {
        var arr = lsLoad(LS_DELETED_PRODUCTS) || [];
        if (arr.indexOf(name) === -1) arr.push(name);
        lsSave(LS_DELETED_PRODUCTS, arr);
    }

    function lsIsDeletedProduct(name) {
        var arr = lsLoad(LS_DELETED_PRODUCTS) || [];
        return arr.indexOf(name) !== -1;
    }

    function lsRestoreDeletedProduct(name) {
        var arr = lsLoad(LS_DELETED_PRODUCTS) || [];
        var newArr = [];
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] !== name) newArr.push(arr[i]);
        }
        lsSave(LS_DELETED_PRODUCTS, newArr);
    }

    function lsSavePriceOverride(name, price, priceDisplay) {
        var obj = lsLoad(LS_PRICE_OVERRIDES) || {};
        obj[name] = { price: price, priceDisplay: priceDisplay };
        lsSave(LS_PRICE_OVERRIDES, obj);
    }

    function lsRemovePriceOverride(name) {
        var obj = lsLoad(LS_PRICE_OVERRIDES) || {};
        delete obj[name];
        lsSave(LS_PRICE_OVERRIDES, obj);
    }

    function lsSaveCustomCategory(cat) {
        var arr = lsLoad(LS_CUSTOM_CATEGORIES) || [];
        var found = false;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id === cat.id) { arr[i] = cat; found = true; break; }
        }
        if (!found) arr.push(cat);
        lsSave(LS_CUSTOM_CATEGORIES, arr);
    }

    // Global formatPrice (COP style with dots as thousands separators)
    function formatPrice(num) {
        var str = Math.round(num).toString();
        var parts = [];
        while (str.length > 3) {
            parts.unshift(str.slice(-3));
            str = str.slice(0, -3);
        }
        parts.unshift(str);
        return parts.join('.');
    }

    // Global sortGridByPrice (used by restore IIFE before admin IIFE runs)
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
    window.sortGridByPrice = sortGridByPrice;

export { LS_CUSTOM_PRODUCTS, LS_CUSTOM_CATEGORIES, LS_DELETED_PRODUCTS, LS_PRICE_OVERRIDES, lsSave, lsLoad, lsRemove, lsSaveCustomProduct, lsRemoveCustomProduct, lsSaveDeletedProduct, lsIsDeletedProduct, lsRestoreDeletedProduct, lsSavePriceOverride, lsRemovePriceOverride, lsSaveCustomCategory, formatPrice, sortGridByPrice };
