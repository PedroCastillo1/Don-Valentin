import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Rol } from "@dv/shared";
import { SECTOR_DE_ROL } from "@dv/shared";
import type { Db, Row, Tx } from "../db/pool.ts";
import { exec, one, rows, withTx } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";

/*
 * Circuito de pedidos (Hito 4): el comensal pide desde el QR (o el mozo carga el pedido), cada ítem va al sector
 * que lo prepara, el sector lo pasa a «en preparación» y «listo», y el mozo lo entrega.
 * Las fechas de la base llegan como texto UTC "AAAA-MM-DD HH:MM:SS.mmm".
 */

type Sector = "cocina" | "parrilla" | "barra";
export type EstadoItem = "recibido" | "en_preparacion" | "listo" | "entregado" | "cancelado";

const iso = (v: unknown): string | null => (v ? `${String(v).replace(" ", "T")}Z` : null);
const minutosDesde = (v: unknown, ahora: Date): number =>
  Math.max(0, Math.floor((ahora.getTime() - Date.parse(iso(v)!)) / 60_000));

// ───────── Permiso del comensal (cookie atada a la sesión de mesa) ─────────

export interface IngresoComensal {
  numero: number;
  sesionId: number;
  /** Valor de la cookie: "<id de sesión>.<token>". */
  credencial: string;
}

/** RF-Q1: el QR abre la mesa correcta; solo se puede pedir si el mozo abrió la sesión de esa mesa. */
export async function ingresoComensal(db: Db, mesaToken: string): Promise<IngresoComensal> {
  if (!/^[0-9a-f]{32}$/.test(mesaToken))
    throw new ErrorDeDominio(404, "QR_NO_VALIDO", "Este código no corresponde a ninguna mesa.");
  const s = await one(
    db,
    `SELECT s.id, s.token_comensal, m.numero FROM mesas m
       LEFT JOIN sesiones_mesa s ON s.mesa_id = m.id AND s.estado = 'abierta'
      WHERE m.qr_token = ? AND m.activa = 1`,
    [mesaToken],
  );
  if (!s) throw new ErrorDeDominio(404, "QR_NO_VALIDO", "Este código no corresponde a ninguna mesa.");
  if (!s.id)
    throw new ErrorDeDominio(
      409,
      "MESA_SIN_SESION",
      "Tu mesa todavía no está habilitada para pedir. Avisale al mozo y mientras tanto mirá la carta.",
    );
  let token = s.token_comensal as string | null;
  if (!token) {
    token = randomBytes(16).toString("hex");
    // Si dos celulares entran a la vez, gana el primero y el segundo lee el mismo token.
    await exec(db, "UPDATE sesiones_mesa SET token_comensal = ? WHERE id = ? AND token_comensal IS NULL", [
      token,
      s.id,
    ]);
    token = (await one(db, "SELECT token_comensal FROM sesiones_mesa WHERE id = ?", [s.id]))!.token_comensal as string;
  }
  return { numero: s.numero, sesionId: Number(s.id), credencial: `${s.id}.${token}` };
}

/** Devuelve la sesión si la cookie corresponde a la sesión abierta de esa mesa; si se liberó, la cookie ya no sirve. */
export async function sesionDelComensal(db: Db, mesaToken: string, credencial: string | undefined): Promise<number> {
  const [id, token] = (credencial ?? "").split(".");
  const s = await one(
    db,
    `SELECT s.id, s.token_comensal FROM sesiones_mesa s JOIN mesas m ON m.id = s.mesa_id
      WHERE m.qr_token = ? AND s.estado = 'abierta' AND s.id = ?`,
    [mesaToken, /^\d+$/.test(id ?? "") ? Number(id) : 0],
  );
  const ok =
    s?.token_comensal &&
    token &&
    token.length === 32 &&
    timingSafeEqual(Buffer.from(token), Buffer.from(String(s.token_comensal)));
  if (!ok)
    throw new ErrorDeDominio(
      403,
      "SESION_COMENSAL",
      "Esta mesa ya no está habilitada desde este celular. Volvé a escanear el código QR de la mesa.",
    );
  return Number(s!.id);
}

// ───────── Alta de pedido (RF-Q2, RF-Q4) ─────────

export interface ItemPedidoDto {
  id: number;
  producto: string;
  variante: string;
  cantidad: number;
  nota: string | null;
  sector: Sector;
  estado: EstadoItem;
  precioUnitario: number;
}
export interface PedidoDto {
  id: number;
  origen: "qr" | "mozo";
  estado: EstadoItem;
  creadoEn: string;
  items: ItemPedidoDto[];
}

export async function crearPedido(
  db: Db,
  sesionId: number,
  items: { varianteId: number; cantidad: number; nota?: string | undefined }[],
  origen: "qr" | "mozo",
  usuarioId: number | null = null,
): Promise<PedidoDto> {
  const ids = [...new Set(items.map((i) => i.varianteId))];
  const vars = await rows(
    db,
    `SELECT v.id, v.precio, v.etiqueta, p.nombre, p.disponible, p.sector_preparacion_id
       FROM variantes_producto v JOIN productos p ON p.id = v.producto_id
      WHERE v.id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  const porId = new Map(vars.map((v) => [Number(v.id), v]));
  for (const i of items) {
    const v = porId.get(i.varianteId);
    if (!v) throw new ErrorDeDominio(400, "PRODUCTO_INEXISTENTE", "Uno de los productos ya no está en la carta.");
    if (v.disponible !== 1 || v.precio === null)
      throw new ErrorDeDominio(409, "PRODUCTO_NO_DISPONIBLE", `${v.nombre} no está disponible en este momento.`);
  }
  const id = await withTx(db, async (tx) => {
    // La sesión se bloquea: si el mozo la libera al mismo tiempo, el pedido no queda colgado de una mesa cerrada.
    const s = await one(tx, "SELECT estado FROM sesiones_mesa WHERE id = ? FOR UPDATE", [sesionId]);
    if (s?.estado !== "abierta")
      throw new ErrorDeDominio(409, "MESA_LIBERADA", "La mesa ya se liberó. Volvé a escanear el código QR.");
    const p = await exec(tx, "INSERT INTO pedidos (sesion_mesa_id, origen, creado_por) VALUES (?,?,?)", [
      sesionId,
      origen,
      usuarioId,
    ]);
    for (const i of items) {
      const v = porId.get(i.varianteId)!;
      await exec(
        tx,
        "INSERT INTO pedido_items (pedido_id, variante_id, sector_preparacion_id, cantidad, precio_unitario, nota) VALUES (?,?,?,?,?,?)",
        [p.insertId, i.varianteId, v.sector_preparacion_id, i.cantidad, v.precio, i.nota || null],
      );
    }
    return p.insertId;
  });
  return (await pedidosDe(db, "p.id = ?", [id]))[0]!;
}

const SELECT_ITEMS = `SELECT i.id, i.pedido_id, i.cantidad, i.nota, i.estado, i.precio_unitario, i.creado_en, i.en_preparacion_en,
       i.listo_en, sp.codigo AS sector, pr.nombre AS producto, v.etiqueta AS variante, ts.tiempo_maximo_min,
       p.origen, p.estado AS estado_pedido, p.creado_en AS pedido_creado_en, p.sesion_mesa_id, m.numero AS mesa
  FROM pedido_items i
  JOIN pedidos p ON p.id = i.pedido_id
  JOIN sesiones_mesa s ON s.id = p.sesion_mesa_id
  JOIN mesas m ON m.id = s.mesa_id
  JOIN sectores_preparacion sp ON sp.id = i.sector_preparacion_id
  JOIN variantes_producto v ON v.id = i.variante_id
  JOIN productos pr ON pr.id = v.producto_id
  JOIN tipos_solicitud ts ON ts.id = pr.tipo_solicitud_id`;

function itemDto(x: Row): ItemPedidoDto {
  return {
    id: Number(x.id),
    producto: x.producto,
    variante: x.variante === "única" || x.variante === "único" ? "" : x.variante,
    cantidad: x.cantidad,
    nota: x.nota,
    sector: x.sector,
    estado: x.estado,
    precioUnitario: Number(x.precio_unitario),
  };
}

async function pedidosDe(db: Db | Tx, where: string, params: unknown[]): Promise<PedidoDto[]> {
  const r = await rows(db, `${SELECT_ITEMS} WHERE ${where} ORDER BY p.creado_en DESC, i.id`, params);
  const pedidos = new Map<number, PedidoDto>();
  for (const x of r) {
    const id = Number(x.pedido_id);
    if (!pedidos.has(id))
      pedidos.set(id, { id, origen: x.origen, estado: x.estado_pedido, creadoEn: iso(x.pedido_creado_en)!, items: [] });
    pedidos.get(id)!.items.push(itemDto(x));
  }
  return [...pedidos.values()];
}

/** Lo que ve el comensal: los pedidos de su sesión (nunca los de un grupo anterior en la misma mesa). */
export function pedidosDeSesion(db: Db, sesionId: number): Promise<PedidoDto[]> {
  return pedidosDe(db, "p.sesion_mesa_id = ?", [sesionId]);
}

// ───────── Paneles de sector (RF-Q2, RF-Q3) ─────────

export interface ItemSectorDto extends ItemPedidoDto {
  pedidoId: number;
  mesa: number;
  origen: "qr" | "mozo";
  creadoEn: string;
  minutos: number;
  tiempoMaximo: number;
  demorado: boolean;
}

/** Ítems pendientes de entregar, con la demora contra el tiempo máximo de su tipo de solicitud (planilla). */
export async function itemsActivos(db: Db, sector: Sector | null, ahora = new Date()): Promise<ItemSectorDto[]> {
  const r = await rows(
    db,
    `${SELECT_ITEMS} WHERE i.estado IN ('recibido','en_preparacion','listo')${sector ? " AND sp.codigo = ?" : ""}
      ORDER BY i.creado_en, i.id`,
    sector ? [sector] : [],
  );
  return r.map((x) => {
    // La demora corre hasta que el plato está listo: después le toca al mozo.
    const fin = x.listo_en ? new Date(iso(x.listo_en)!) : ahora;
    const minutos = minutosDesde(x.creado_en, fin);
    return {
      ...itemDto(x),
      pedidoId: Number(x.pedido_id),
      mesa: x.mesa,
      origen: x.origen,
      creadoEn: iso(x.creado_en)!,
      minutos,
      tiempoMaximo: x.tiempo_maximo_min,
      demorado: minutos > x.tiempo_maximo_min,
    };
  });
}

const SIGUIENTE: Record<EstadoItem, EstadoItem[]> = {
  recibido: ["en_preparacion", "cancelado"],
  en_preparacion: ["listo", "cancelado"],
  listo: ["entregado"],
  entregado: [],
  cancelado: [],
};

/** El estado del pedido sigue al más atrasado de sus ítems (sin contar los cancelados). */
async function recalcularPedido(tx: Tx, pedidoId: number): Promise<void> {
  const r = await rows(tx, "SELECT estado FROM pedido_items WHERE pedido_id = ?", [pedidoId]);
  const vivos: EstadoItem[] = r.map((x) => x.estado as EstadoItem).filter((e) => e !== "cancelado");
  const orden: EstadoItem[] = ["recibido", "en_preparacion", "listo", "entregado"];
  const estado: EstadoItem = vivos.length ? orden.find((e) => vivos.includes(e))! : "cancelado";
  await exec(tx, "UPDATE pedidos SET estado = ? WHERE id = ?", [estado, pedidoId]);
}

/**
 * RF-Q3: recibido → en preparación → listo (el sector) → entregado (el mozo).
 * Un puesto solo mueve los ítems de su sector; cancelar queda para el Encargado y Administración.
 */
export async function cambiarEstadoItem(db: Db, itemId: number, nuevo: EstadoItem, rol: Rol): Promise<ItemPedidoDto> {
  return withTx(db, async (tx) => {
    const it = await one(
      tx,
      `SELECT i.id, i.pedido_id, i.estado, sp.codigo AS sector FROM pedido_items i
         JOIN sectores_preparacion sp ON sp.id = i.sector_preparacion_id WHERE i.id = ? FOR UPDATE OF i`,
      [itemId],
    );
    if (!it) throw new ErrorDeDominio(404, "ITEM_NO_ENCONTRADO", "Ese ítem no existe.");
    const propio = SECTOR_DE_ROL[rol];
    if (propio && propio !== it.sector)
      throw new ErrorDeDominio(403, "OTRO_SECTOR", "Ese plato lo prepara otro sector.");
    if (nuevo === "entregado" && propio) throw new ErrorDeDominio(403, "SOLO_SALON", "La entrega la registra el mozo.");
    if (nuevo === "cancelado" && rol !== "admin" && rol !== "encargado")
      throw new ErrorDeDominio(403, "SOLO_ENCARGADO", "Solo el Encargado puede cancelar un ítem.");
    if (!SIGUIENTE[it.estado as EstadoItem].includes(nuevo))
      throw new ErrorDeDominio(409, "ESTADO_INVALIDO", "Ese ítem ya cambió de estado. Actualizá la pantalla.");
    const marca: Partial<Record<EstadoItem, string>> = {
      en_preparacion: ", en_preparacion_en = CURRENT_TIMESTAMP(3)",
      listo: ", listo_en = CURRENT_TIMESTAMP(3)",
      entregado: ", entregado_en = CURRENT_TIMESTAMP(3)",
    };
    await exec(tx, `UPDATE pedido_items SET estado = ?${marca[nuevo] ?? ""} WHERE id = ?`, [nuevo, itemId]);
    await recalcularPedido(tx, Number(it.pedido_id));
    return itemDto((await one(tx, `${SELECT_ITEMS} WHERE i.id = ?`, [itemId]))!);
  });
}

/** Mesas con sesión abierta, para que el mozo elija dónde cargar un pedido. */
export async function mesasAbiertas(db: Db): Promise<{ sesionId: number; mesaId: number; numero: number }[]> {
  const r = await rows(
    db,
    "SELECT s.id, m.id AS mesa_id, m.numero FROM sesiones_mesa s JOIN mesas m ON m.id = s.mesa_id WHERE s.estado = 'abierta' ORDER BY m.numero",
  );
  return r.map((x) => ({ sesionId: Number(x.id), mesaId: x.mesa_id, numero: x.numero }));
}

export async function sesionAbiertaDeMesa(db: Db, mesaId: number): Promise<number> {
  const s = await one(db, "SELECT id FROM sesiones_mesa WHERE mesa_id = ? AND estado = 'abierta'", [mesaId]);
  if (!s) throw new ErrorDeDominio(409, "SIN_SESION", "Esa mesa no tiene una sesión abierta. Abrila primero.");
  return Number(s.id);
}

// ───────── Carta y precios (H4) ─────────

export interface ProductoAdminDto {
  id: number;
  categoria: string;
  grupo: string;
  nombre: string;
  sector: Sector;
  disponible: boolean;
  variantes: { id: number; etiqueta: string; precio: number | null }[];
}

export async function cartaAdmin(db: Db): Promise<ProductoAdminDto[]> {
  const prods = await rows(
    db,
    `SELECT p.id, p.nombre, p.disponible, c.nombre AS categoria, c.grupo, sp.codigo AS sector
       FROM productos p JOIN categorias_carta c ON c.id = p.categoria_id JOIN sectores_preparacion sp ON sp.id = p.sector_preparacion_id
      ORDER BY c.orden, p.orden`,
  );
  const vars = await rows(
    db,
    "SELECT id, producto_id, etiqueta, precio FROM variantes_producto ORDER BY producto_id, orden",
  );
  const porProducto = new Map<number, ProductoAdminDto["variantes"]>();
  for (const v of vars) {
    const l = porProducto.get(v.producto_id) ?? [];
    l.push({ id: v.id, etiqueta: v.etiqueta, precio: v.precio === null ? null : Number(v.precio) });
    porProducto.set(v.producto_id, l);
  }
  return prods.map((p) => ({
    id: p.id,
    categoria: p.categoria,
    grupo: p.grupo,
    nombre: p.nombre,
    sector: p.sector,
    disponible: p.disponible === 1,
    variantes: porProducto.get(p.id) ?? [],
  }));
}

export async function editarPrecio(
  db: Db,
  varianteId: number,
  precio: number | null,
): Promise<{ producto: string; etiqueta: string; antes: number | null; despues: number | null }> {
  return withTx(db, async (tx) => {
    const v = await one(
      tx,
      "SELECT v.precio, v.etiqueta, p.nombre FROM variantes_producto v JOIN productos p ON p.id = v.producto_id WHERE v.id = ? FOR UPDATE OF v",
      [varianteId],
    );
    if (!v) throw new ErrorDeDominio(404, "VARIANTE_NO_ENCONTRADA", "Ese precio no existe.");
    await exec(tx, "UPDATE variantes_producto SET precio = ?, actualizado_en = CURRENT_TIMESTAMP(3) WHERE id = ?", [
      precio,
      varianteId,
    ]);
    return {
      producto: v.nombre,
      etiqueta: v.etiqueta,
      antes: v.precio === null ? null : Number(v.precio),
      despues: precio,
    };
  });
}

export async function editarDisponible(db: Db, productoId: number, disponible: boolean): Promise<string> {
  const r = await one(
    db,
    "UPDATE productos SET disponible = ?, actualizado_en = CURRENT_TIMESTAMP(3) WHERE id = ? RETURNING nombre",
    [disponible ? 1 : 0, productoId],
  );
  if (!r) throw new ErrorDeDominio(404, "PRODUCTO_NO_ENCONTRADO", "Ese producto no existe.");
  return r.nombre as string;
}
