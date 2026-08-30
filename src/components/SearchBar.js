export function SearchBar() {
  return `<div class="search-bar-container" id="searchBarContainer">
    <div class="search-bar-wrap">
      <i class="fas fa-search search-icon" id="searchIcon"></i>
      <input type="text" id="searchInput" placeholder="Buscar producto..." autocomplete="off">
      <button class="search-clear-btn" id="searchClearBtn" type="button" aria-label="Limpiar búsqueda"><i class="fas fa-times"></i></button>
    </div>
  </div><div class="search-results-info" id="searchResultsInfo"></div>`;
}
