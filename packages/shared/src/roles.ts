export const ROLES = ["admin", "encargado", "mozo", "parrillero", "cocinero", "barra"] as const;
export type Rol = (typeof ROLES)[number];

export const ROL_NOMBRE: Record<Rol, string> = {
  admin: "Administración",
  encargado: "Encargado de Salón",
  mozo: "Mozo",
  parrillero: "Parrillero",
  cocinero: "Cocinero",
  barra: "Barra",
};

export const PERMISOS = [
  "reservas:ver",
  "reservas:crear",
  "reservas:editar",
  "salon:operar",
  "mesas:ver",
  "mesas:administrar",
  "qr:generar",
  "sesion_mesa:abrir",
  "sesion_mesa:cerrar",
  "parametros:ver",
  "parametros:editar",
  "usuarios:administrar",
  "auditoria:ver",
  "panel_sector:ver",
  "pedidos:ver",
  "pedidos:tomar",
  "carta:editar",
] as const;
export type Permiso = (typeof PERMISOS)[number];

/**
 * RNF-3: cada perfil accede solo a sus funciones. El mozo no administra mesas.
 * Fuente: Alcance v4 §1.4; Fase de Implementación v4 (criterios de aceptación del Sistema integrado).
 */
export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  admin: PERMISOS,
  encargado: [
    "reservas:ver",
    "reservas:crear",
    "reservas:editar",
    "salon:operar",
    "mesas:ver",
    "mesas:administrar",
    "qr:generar",
    "sesion_mesa:abrir",
    "sesion_mesa:cerrar",
    "parametros:ver",
    "parametros:editar",
    "usuarios:administrar",
    "auditoria:ver",
    "panel_sector:ver",
    "pedidos:ver",
    "pedidos:tomar",
    "carta:editar",
  ],
  mozo: [
    "reservas:ver",
    "reservas:crear",
    "salon:operar",
    "sesion_mesa:abrir",
    "sesion_mesa:cerrar",
    "pedidos:ver",
    "pedidos:tomar",
  ],
  parrillero: ["panel_sector:ver"],
  cocinero: ["panel_sector:ver"],
  barra: ["panel_sector:ver"],
};

/** RF-Q2: cada puesto prepara lo de su sector; Administración y el Encargado ven y operan los tres. */
export const SECTOR_DE_ROL: Partial<Record<Rol, "cocina" | "parrilla" | "barra">> = {
  cocinero: "cocina",
  parrillero: "parrilla",
  barra: "barra",
};

export function puede(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol].includes(permiso);
}

/**
 * Jerarquía para administrar usuarios (RNF-3): nadie gestiona a un rol igual o superior al propio.
 * Administración gestiona a todos; el Encargado de Salón solo al personal operativo.
 */
export const ROLES_GESTIONABLES: Record<Rol, readonly Rol[]> = {
  admin: ROLES,
  encargado: ["mozo", "parrillero", "cocinero", "barra"],
  mozo: [],
  parrillero: [],
  cocinero: [],
  barra: [],
};

export function puedeGestionarRol(actor: Rol, objetivo: Rol): boolean {
  return ROLES_GESTIONABLES[actor].includes(objetivo);
}
