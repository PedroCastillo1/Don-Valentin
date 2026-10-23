const peso = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const precio = (n: number | null): string => (n === null ? "Consultar" : `$ ${peso.format(n)}`);

/** Etiqueta de un producto con un solo tamaño: no se muestra en botones ni pedidos. */
export const UNICA = new Set(["única", "único", ""]);

/** Normaliza texto para búsquedas: sin tildes ni símbolos, en minúsculas y con equivalencias habituales de la carta. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/½/g, " 1/2 medio media ")
    .replace(/¼/g, " 1/4 cuarto ")
    .replace(/¾/g, " 3/4 ")
    .replace(/⅜/g, " 3/8 ")
    .replace(/m[ou]zz?arell?a/g, "muzzarella mozzarella muza")
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();
}

/**
 * Devuelve true si todas las palabras buscadas aparecen en cualquier orden dentro del texto (sin importar tildes,
 * mayúsculas ni si la palabra está al principio o en el medio del nombre, categoría, nota o variante).
 */
export function coincideBusqueda(texto: string, consulta: string): boolean {
  const q = normalizarBusqueda(consulta);
  if (!q) return true;
  const base = normalizarBusqueda(texto);
  const palabras = q.split(/\s+/).filter(Boolean);
  return palabras.every((p) => base.includes(p));
}

/** Puntúa coincidencias priorizando el nombre del producto antes que la categoría o nota. */
export function puntajeBusqueda(nombre: string, contexto: string, consulta: string): number {
  const q = normalizarBusqueda(consulta);
  if (!q) return 1;
  const nom = normalizarBusqueda(nombre);
  const palabras = q.split(/\s+/).filter(Boolean);
  if (nom.startsWith(q)) return 4;
  if (palabras.every((p) => nom.includes(p))) return 3;
  const ctx = normalizarBusqueda(`${nombre} ${contexto}`);
  if (palabras.every((p) => ctx.includes(p))) return 2;
  return 0;
}
