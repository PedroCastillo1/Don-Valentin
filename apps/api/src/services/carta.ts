import type { Db } from "../db/pool.ts";
import { rows } from "../db/pool.ts";

export interface CartaPublica {
  grupos: {
    grupo: string;
    categorias: {
      id: string;
      nombre: string;
      productos: { id: number; nombre: string; nota: string | null; sinTacc: boolean; variantes: { etiqueta: string; precio: number | null }[] }[];
    }[];
  }[];
}

export async function cartaPublica(db: Db): Promise<CartaPublica> {
  const cats = await rows(db, "SELECT id, codigo, nombre, grupo FROM categorias_carta ORDER BY orden");
  const prods = await rows(db, "SELECT id, categoria_id, nombre, nota, sin_tacc FROM productos WHERE disponible = 1 ORDER BY orden");
  const vars = await rows(db, "SELECT producto_id, etiqueta, precio FROM variantes_producto ORDER BY producto_id, orden");
  const variantesPorProducto = new Map<number, { etiqueta: string; precio: number | null }[]>();
  for (const v of vars) {
    const l = variantesPorProducto.get(v.producto_id) ?? [];
    l.push({ etiqueta: v.etiqueta, precio: v.precio === null ? null : Number(v.precio) });
    variantesPorProducto.set(v.producto_id, l);
  }
  const grupos: CartaPublica["grupos"] = [];
  for (const c of cats) {
    let g = grupos.find((x) => x.grupo === c.grupo);
    if (!g) grupos.push((g = { grupo: c.grupo, categorias: [] }));
    g.categorias.push({
      id: c.codigo,
      nombre: c.nombre,
      productos: prods.filter((p) => p.categoria_id === c.id).map((p) => ({ id: p.id, nombre: p.nombre, nota: p.nota, sinTacc: p.sin_tacc === 1, variantes: variantesPorProducto.get(p.id) ?? [] })),
    });
  }
  return { grupos };
}
