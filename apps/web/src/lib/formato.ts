const peso = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const precio = (n: number | null): string => (n === null ? "Consultar" : `$ ${peso.format(n)}`);

/** Etiqueta de un producto con un solo tamaño: no se muestra en botones ni pedidos. */
export const UNICA = new Set(["única", "único", ""]);
