import { z } from "zod";
import { ORIGENES_RESERVA } from "./dominio.ts";

/** Normaliza un teléfono argentino a dígitos (sin espacios, guiones ni paréntesis). */
export function normalizarTelefono(raw: string): string {
  return raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

const fechaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha con formato AAAA-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "La fecha no existe");

export const telefonoSchema = z
  .string()
  .trim()
  .transform(normalizarTelefono)
  .refine((t) => t.length >= 8 && t.length <= 15, "Ingresá un teléfono de 8 a 15 dígitos");

/** RNF-4: solo nombre y teléfono; el aviso de uso es obligatorio. */
export const reservaPublicaSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre").max(80),
  telefono: telefonoSchema,
  personas: z.number().int().min(1, "Mínimo 1 persona").max(40),
  fecha: fechaIso,
  franjaId: z.number().int().positive(),
  comentarios: z.string().trim().max(300).optional(),
  aceptaAviso: z.literal(true, { error: "Aceptá el aviso de uso de datos para reservar" }),
});
export type ReservaPublicaInput = z.infer<typeof reservaPublicaSchema>;

export const reservaInternaSchema = reservaPublicaSchema
  .omit({ aceptaAviso: true })
  .extend({ origen: z.enum(ORIGENES_RESERVA.filter((o) => o !== "web") as ["telefono", "presencial"]) });
export type ReservaInternaInput = z.infer<typeof reservaInternaSchema>;

export const disponibilidadQuerySchema = z.object({
  fecha: fechaIso,
  personas: z.coerce.number().int().min(1).max(40),
});

export const loginSchema = z.object({
  usuario: z.string().trim().min(2).max(40),
  password: z.string().min(1).max(200),
});

export const usuarioNuevoSchema = z.object({
  usuario: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, "3 a 40 caracteres: letras, números, punto, guion"),
  nombre: z.string().trim().min(2).max(80),
  rol: z.enum(["admin", "encargado", "mozo", "parrillero", "cocinero", "barra"]),
  password: z.string().min(10, "Mínimo 10 caracteres").max(200),
});

export const mesaNuevaSchema = z.object({
  numero: z.number().int().min(1).max(999),
  sectorSalonId: z.number().int().positive(),
  capacidad: z.number().int().min(1).max(40),
});
export const mesaEdicionSchema = z.object({
  sectorSalonId: z.number().int().positive().optional(),
  capacidad: z.number().int().min(1).max(40).optional(),
  activa: z.boolean().optional(),
});

export const parametroEdicionSchema = z.object({
  valor: z.string().trim().min(1).max(255),
});
export const aforoEdicionSchema = z.object({
  aforoPersonas: z.number().int().min(0).max(2000),
});
export const tipoSolicitudEdicionSchema = z.object({
  tiempoMaximoMin: z.number().int().min(1).max(240),
});
