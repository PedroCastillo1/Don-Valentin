const peso = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const precio = (n: number | null): string => (n === null ? "Consultar" : `$ ${peso.format(n)}`);
