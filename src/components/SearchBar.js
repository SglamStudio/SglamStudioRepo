export function SearchBar() {
  return `<div class="search-panel" id="searchBarContainer">
    <div class="search-bar-wrap">
      <i class="fas fa-magnifying-glass search-icon" id="searchIcon" aria-hidden="true"></i>
      <input type="text" id="searchInput" placeholder="Busca labiales, bases, brochas…" autocomplete="off" enterkeyhint="search" aria-label="Buscar producto">
      <button class="search-clear-btn" id="searchClearBtn" type="button" aria-label="Limpiar búsqueda"><i class="fas fa-xmark" aria-hidden="true"></i></button>
    </div>
  </div>`;
}

export function SearchInfo() {
  return '<div class="search-results-info" id="searchResultsInfo" role="status" aria-live="polite"></div>';
}
