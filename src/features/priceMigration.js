// ─── PRICE MIGRATION: clear stale localStorage overrides for updated prices ───
(function clearStalePriceOverrides() {
    var LS_KEY = 'glam_price_overrides';
    var updatedProducts = [
        'Corrector Bloomshell Tono 4.5 10ml',
        'Corrector Pure Cover Majikal Of White Tono 2',
        'Corrector Pure Cover Majikal Snow Tono 1',
        'Corrector Pure Cover Majikal Latin Tono 3'
    ];
    try {
        var data = JSON.parse(localStorage.getItem(LS_KEY));
        if (data) {
            var changed = false;
            for (var i = 0; i < updatedProducts.length; i++) {
                if (data.hasOwnProperty(updatedProducts[i])) {
                    delete data[updatedProducts[i]];
                    changed = true;
                }
            }
            if (changed) {
                localStorage.setItem(LS_KEY, JSON.stringify(data));
            }
        }
    } catch(e) {}
})();
