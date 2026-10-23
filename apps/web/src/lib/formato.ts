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

const TERMINOS_CATEGORIA: Record<string, string> = {
  pizzas: "pizza pizzas",
  "pastas caseras": "pasta pastas",
  sandwiches: "sandwich sandwiches",
  "vinos blancos": "vino blanco vinos blancos",
  "vinos tintos": "vino tinto vinos tintos",
  cervezas: "cerveza cervezas",
  "bebidas sin alcohol": "gaseosa bebida agua",
  aperitivos: "aperitivo aperitivos",
  espumantes: "espumante espumantes",
  postres: "postre postres",
  "papas fritas": "papa papas fritas",
  guarniciones: "guarnicion guarniciones",
};

export function terminosDeCategoria(categoria: string): string {
  return TERMINOS_CATEGORIA[normalizarBusqueda(categoria)] ?? "";
}

/**
 * Devuelve true si todas las palabras buscadas aparecen en cualquier orden dentro del texto (sin importar tildes,
 * mayúsculas ni si la palabra está al principio o en el medio del nombre o categoría específica).
 */
export function coincideBusqueda(texto: string, consulta: string): boolean {
  const q = normalizarBusqueda(consulta);
  if (!q) return true;
  const base = normalizarBusqueda(texto);
  const palabras = q.split(/\s+/).filter(Boolean);
  return palabras.every((p) => base.includes(p));
}

/**
 * Puntúa coincidencias de un producto de la carta usando únicamente su nombre y su categoría específica
 * (sin mezclar el grupo general como «Pizzas y pastas» ni notas accesorias).
 */
export function puntajeBusqueda(nombre: string, categoria: string, consulta: string): number {
  const q = normalizarBusqueda(consulta);
  if (!q) return 1;
  const nom = normalizarBusqueda(nombre);
  const catNorm = normalizarBusqueda(categoria);
  const terminosCat = TERMINOS_CATEGORIA[catNorm] ?? "";
  const palabras = q.split(/\s+/).filter(Boolean);

  if (nom.startsWith(q)) return 5;
  // Si busca "pizza" o "pizza calabresa", las pizzas de la categoría Pizzas van primero que "Matambre a la pizza"
  if (catNorm === "pizzas" && `pizza ${nom}`.startsWith(q)) return 4;
  if (palabras.every((p) => nom.includes(p))) return 3;
  const combinado = `${nom} ${terminosCat}`;
  if (palabras.every((p) => combinado.includes(p))) return catNorm === "pizzas" && palabras.includes("pizza") ? 4 : 2;
  return 0;
}
