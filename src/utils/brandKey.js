// Clave para comparar marcas sin importar mayúsculas ni tildes.
export function brandKey(name) {
  return String(name || '').trim().toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
