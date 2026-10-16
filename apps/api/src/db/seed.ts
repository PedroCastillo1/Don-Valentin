import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { ROL_NOMBRE, ROLES, SECTORES_PREPARACION } from "@dv/shared";
import type { Rol } from "@dv/shared";
import type { Db } from "./pool.ts";
import { exec, one, rows } from "./pool.ts";

const CARTA_PATH = process.env.DV_DB_DIR
  ? path.join(process.env.DV_DB_DIR, "data", "carta.json")
  : path.resolve(import.meta.dirname, "../../../../db/data/carta.json");

const FUENTE_ALCANCE =
  "Declaración del Alcance v4 §1.5 (parámetro definido; valor a validar con el Encargado, actividad 1.2.3.4)";
const FUENTE_IMPL = "Fase de Implementación v4 (planilla de parametrización base)";

interface CartaJson {
  categorias: { id: string; nombre: string; grupo: string; orden: number }[];
  productos: {
    nombre: string;
    categoria: string;
    sector: string;
    nota?: string;
    sinTacc?: boolean;
    variantes: { etiqueta: string; precio: number | null }[];
  }[];
}

const ROLES_DESC: Record<Rol, string> = {
  admin: "Administración y Referente Interno de Sistemas: configura el sistema y los usuarios.",
  encargado: "Encargado de Salón: reservas, mesas, franjas, aforo, tiempos, usuarios y QR.",
  mozo: "Toma reservas por teléfono o en persona y abre la sesión de la mesa. No administra mesas.",
  parrillero: "Ve los pedidos del sector parrilla (panel previsto para el Hito 4).",
  cocinero: "Ve los pedidos del sector cocina (panel previsto para el Hito 4).",
  barra: "Ve los pedidos del sector barra (panel previsto para el Hito 4).",
};

/** Tipos de solicitud: 14 en total (el Alcance prevé entre 10 y 15). Tiempos máximos provisorios hasta la validación del local. */
const TIPOS: { sector: string; codigo: string; nombre: string; min: number }[] = [
  { sector: "parrilla", codigo: "carnes-vacunas", nombre: "Cortes a la parrilla", min: 25 },
  { sector: "parrilla", codigo: "achuras", nombre: "Achuras", min: 20 },
  { sector: "parrilla", codigo: "pollo-parrillada", nombre: "Pollo y parrillada", min: 35 },
  { sector: "parrilla", codigo: "provoleta", nombre: "Provoleta", min: 15 },
  { sector: "parrilla", codigo: "sandwiches-parrilla", nombre: "Choripán, lomito y sándwiches de parrilla", min: 15 },
  { sector: "cocina", codigo: "milanesas", nombre: "Milanesas y nuggets", min: 20 },
  { sector: "cocina", codigo: "pizzas", nombre: "Pizzas", min: 25 },
  { sector: "cocina", codigo: "pastas", nombre: "Pastas caseras", min: 20 },
  { sector: "cocina", codigo: "papas-guarniciones", nombre: "Papas, ensaladas y guarniciones", min: 15 },
  { sector: "cocina", codigo: "platos-cocina", nombre: "Hamburguesas, rabas y tortilla", min: 20 },
  { sector: "cocina", codigo: "postres", nombre: "Postres", min: 10 },
  { sector: "barra", codigo: "vinos", nombre: "Vinos", min: 10 },
  { sector: "barra", codigo: "cervezas-sin-alcohol", nombre: "Cervezas y bebidas sin alcohol", min: 5 },
  { sector: "barra", codigo: "aperitivos-espumantes", nombre: "Aperitivos y espumantes", min: 5 },
];

export function tipoParaProducto(p: CartaJson["productos"][number]): string {
  const n = p.nombre.toLowerCase();
  switch (p.categoria) {
    case "porciones-individuales":
    case "porciones-con-guarnicion":
      if (/molleja|chinchul|riñón/.test(n)) return "achuras";
      if (/pollo|parrillada/.test(n)) return "pollo-parrillada";
      if (/provoleta/.test(n)) return "provoleta";
      if (/rabas|tortilla|milanesa|nuggets/.test(n)) return /milanesa|nuggets/.test(n) ? "milanesas" : "platos-cocina";
      return "carnes-vacunas";
    case "sandwiches":
      if (p.sector === "parrilla") return "sandwiches-parrilla";
      return /milanesa/.test(n) ? "milanesas" : "platos-cocina";
    case "papas-fritas":
    case "guarniciones":
      return "papas-guarniciones";
    case "pizzas":
      return "pizzas";
    case "pastas":
      return "pastas";
    case "postres":
      return "postres";
    case "vinos-blancos":
    case "vinos-tintos":
      return "vinos";
    case "cervezas":
    case "sin-alcohol":
      return "cervezas-sin-alcohol";
    default:
      return "aperitivos-espumantes";
  }
}

/** Parámetros globales de la planilla. `documentado` = figura en la documentación aprobada; `provisorio` = valor de prueba del equipo. */
const PARAMETROS = [
  [
    "local_apertura",
    "12:00",
    "texto",
    "hh:mm",
    "Hora de apertura del local.",
    "Acta de Constitución v4 §2: el salón atiende de 12:00 a 02:00 de corrido",
    "documentado",
  ],
  [
    "local_cierre",
    "02:00",
    "texto",
    "hh:mm",
    "Hora de cierre del local (del día siguiente).",
    "Acta de Constitución v4 §2: el salón atiende de 12:00 a 02:00 de corrido",
    "documentado",
  ],
  [
    "tolerancia_no_show_min",
    "15",
    "entero",
    "min",
    "Minutos de tolerancia antes de marcar un no-show y liberar la mesa.",
    FUENTE_ALCANCE,
    "provisorio",
  ],
  [
    "reserva_dias_max",
    "30",
    "entero",
    "días",
    "Anticipación máxima con la que se puede reservar.",
    FUENTE_IMPL,
    "provisorio",
  ],
] as const;

const FRANJA_INICIO_H = 12;
const FRANJA_DURACION_MIN = 120;
const FRANJAS_CANT = 7; // 12:00 → 02:00
const AFORO_PROVISORIO = 100;

/** 30 mesas ("unas 30 mesas": Fase de Implementación v4). Capacidades provisorias para pruebas: las valida el Encargado. */
function capacidadProvisoria(numero: number): number {
  if (numero <= 4) return 2;
  if (numero <= 20) return 4;
  if (numero <= 28) return 6;
  return 8;
}

export function nuevoTokenQr(): string {
  return randomBytes(16).toString("hex");
}

export async function seedBase(db: Db): Promise<void> {
  for (const [i, r] of ROLES.entries()) {
    await exec(
      db,
      "INSERT INTO roles (id, codigo, nombre, descripcion) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), descripcion=VALUES(descripcion)",
      [i + 1, r, ROL_NOMBRE[r], ROLES_DESC[r]],
    );
  }
  for (const [i, s] of SECTORES_PREPARACION.entries()) {
    await exec(
      db,
      "INSERT INTO sectores_preparacion (id, codigo, nombre) VALUES (?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [i + 1, s, s[0]?.toUpperCase() + s.slice(1)],
    );
  }
  await exec(
    db,
    "INSERT INTO sectores_salon (codigo, nombre, estado_validacion) VALUES ('salon','Salón','provisorio') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
  );
  const salon = await one<{ id: number } & import("mysql2/promise").RowDataPacket>(
    db,
    "SELECT id FROM sectores_salon WHERE codigo='salon'",
  );
  if (!salon) throw new Error("Falta el sector de salón");

  for (const [clave, valor, tipo, unidad, descripcion, fuente, estado] of PARAMETROS) {
    await exec(
      db,
      "INSERT INTO parametros (clave, valor, tipo, unidad, descripcion, fuente, estado_validacion) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE descripcion=VALUES(descripcion), fuente=VALUES(fuente)",
      [clave, valor, tipo, unidad, descripcion, fuente, estado],
    );
  }

  for (let n = 1; n <= 30; n++) {
    await exec(
      db,
      "INSERT IGNORE INTO mesas (numero, sector_salon_id, capacidad, qr_token, estado_validacion) VALUES (?,?,?,?, 'provisorio')",
      [n, salon.id, capacidadProvisoria(n), nuevoTokenQr()],
    );
  }
  for (let i = 0; i < FRANJAS_CANT; i++) {
    const inicioMin = (FRANJA_INICIO_H * 60 + i * FRANJA_DURACION_MIN) % (24 * 60);
    const hh = String(Math.floor(inicioMin / 60)).padStart(2, "0");
    const mm = String(inicioMin % 60).padStart(2, "0");
    const fin = (inicioMin + FRANJA_DURACION_MIN) % (24 * 60);
    const nombre = `${hh}:${mm} a ${String(Math.floor(fin / 60)).padStart(2, "0")}:${String(fin % 60).padStart(2, "0")}`;
    await exec(
      db,
      "INSERT IGNORE INTO franjas (codigo, nombre, hora_inicio, duracion_min, orden, estado_validacion) VALUES (?,?,?,?,?, 'provisorio')",
      [`F${hh}${mm}`, nombre, `${hh}:${mm}:00`, FRANJA_DURACION_MIN, i + 1],
    );
  }
  await exec(
    db,
    "INSERT IGNORE INTO aforos (franja_id, sector_salon_id, aforo_personas, estado_validacion) SELECT f.id, ?, ?, 'provisorio' FROM franjas f",
    [salon.id, AFORO_PROVISORIO],
  );

  const sectores = await rows<{ id: number; codigo: string } & import("mysql2/promise").RowDataPacket>(
    db,
    "SELECT id, codigo FROM sectores_preparacion",
  );
  const sectorId = new Map(sectores.map((s) => [s.codigo, s.id]));
  for (const t of TIPOS) {
    await exec(
      db,
      "INSERT INTO tipos_solicitud (sector_preparacion_id, codigo, nombre, tiempo_maximo_min, estado_validacion) VALUES (?,?,?,?, 'provisorio') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)",
      [sectorId.get(t.sector), t.codigo, t.nombre, t.min],
    );
  }

  const carta = JSON.parse(await readFile(CARTA_PATH, "utf8")) as CartaJson;
  for (const c of carta.categorias) {
    await exec(
      db,
      "INSERT INTO categorias_carta (codigo, nombre, grupo, orden) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), grupo=VALUES(grupo), orden=VALUES(orden)",
      [c.id, c.nombre, c.grupo, c.orden],
    );
  }
  const yaHayProductos = await one<{ n: number } & import("mysql2/promise").RowDataPacket>(
    db,
    "SELECT COUNT(*) AS n FROM productos",
  );
  if ((yaHayProductos?.n ?? 0) > 0) return;
  const cats = await rows<{ id: number; codigo: string } & import("mysql2/promise").RowDataPacket>(
    db,
    "SELECT id, codigo FROM categorias_carta",
  );
  const catId = new Map(cats.map((c) => [c.codigo, c.id]));
  const tipos = await rows<{ id: number; codigo: string } & import("mysql2/promise").RowDataPacket>(
    db,
    "SELECT id, codigo FROM tipos_solicitud",
  );
  const tipoId = new Map(tipos.map((t) => [t.codigo, t.id]));
  let orden = 0;
  for (const p of carta.productos) {
    orden += 1;
    const res = await exec(
      db,
      "INSERT INTO productos (categoria_id, sector_preparacion_id, tipo_solicitud_id, nombre, nota, sin_tacc, orden) VALUES (?,?,?,?,?,?,?)",
      [
        catId.get(p.categoria),
        sectorId.get(p.sector),
        tipoId.get(tipoParaProducto(p)),
        p.nombre,
        p.nota ?? null,
        p.sinTacc ? 1 : 0,
        orden,
      ],
    );
    for (const [i, v] of p.variantes.entries()) {
      await exec(db, "INSERT INTO variantes_producto (producto_id, etiqueta, precio, orden) VALUES (?,?,?,?)", [
        res.insertId,
        v.etiqueta,
        v.precio,
        i + 1,
      ]);
    }
  }
}

export interface UsuarioSeed {
  usuario: string;
  nombre: string;
  rol: Rol;
  password?: string;
}

/** Crea usuarios del ambiente de prueba. Devuelve las contraseñas generadas (no se guardan en claro en ningún otro lado). */
export async function seedUsuarios(db: Db, lista: UsuarioSeed[]): Promise<Record<string, string>> {
  const creadas: Record<string, string> = {};
  for (const u of lista) {
    const existe = await one(db, "SELECT id FROM usuarios WHERE usuario=?", [u.usuario]);
    if (existe) continue;
    const password = u.password ?? randomBytes(9).toString("base64url");
    const rol = await one<{ id: number } & import("mysql2/promise").RowDataPacket>(
      db,
      "SELECT id FROM roles WHERE codigo=?",
      [u.rol],
    );
    await exec(db, "INSERT INTO usuarios (usuario, nombre, rol_id, password_hash) VALUES (?,?,?,?)", [
      u.usuario,
      u.nombre,
      rol?.id,
      await hash(password),
    ]);
    creadas[u.usuario] = password;
  }
  return creadas;
}

export const USUARIOS_PRUEBA: UsuarioSeed[] = [
  { usuario: "admin", nombre: "Administración (prueba)", rol: "admin" },
  { usuario: "encargado", nombre: "Encargado de Salón (prueba)", rol: "encargado" },
  { usuario: "mozo", nombre: "Mozo (prueba)", rol: "mozo" },
  { usuario: "parrilla", nombre: "Parrillero (prueba)", rol: "parrillero" },
  { usuario: "cocina", nombre: "Cocinero (prueba)", rol: "cocinero" },
  { usuario: "barra", nombre: "Barra (prueba)", rol: "barra" },
];
