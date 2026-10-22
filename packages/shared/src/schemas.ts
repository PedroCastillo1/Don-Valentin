import { z } from "zod";

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
  nombre: z.string().trim().min(2, "Ingresá tu nombre").max(80, "El nombre admite hasta 80 caracteres"),
  telefono: telefonoSchema,
  personas: z
    .number({ error: "Indicá cuántas personas son" })
    .int("Indicá un número entero de personas")
    .min(1, "Mínimo 1 persona")
    .max(40, "Podemos reservar hasta 40 personas por reserva"),
  fecha: fechaIso,
  franjaId: z.number({ error: "Elegí un horario" }).int("Elegí un horario").positive("Elegí un horario"),
  comentarios: z.string().trim().max(300, "Los comentarios admiten hasta 300 caracteres").optional(),
  aceptaAviso: z.literal(true, { error: "Aceptá el aviso de uso de datos para reservar" }),
});
export type ReservaPublicaInput = z.infer<typeof reservaPublicaSchema>;

export const reservaInternaSchema = reservaPublicaSchema
  .omit({ aceptaAviso: true })
  .extend({ origen: z.enum(["telefono", "whatsapp", "presencial"]) });
export type ReservaInternaInput = z.infer<typeof reservaInternaSchema>;

/** RF-R4: cambiar día, horario, personas o datos de contacto de una reserva confirmada. */
export const reservaEdicionSchema = z
  .object({
    nombre: reservaPublicaSchema.shape.nombre.optional(),
    telefono: telefonoSchema.optional(),
    personas: reservaPublicaSchema.shape.personas.optional(),
    fecha: fechaIso.optional(),
    franjaId: reservaPublicaSchema.shape.franjaId.optional(),
    comentarios: z.string().trim().max(300, "Los comentarios admiten hasta 300 caracteres").nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), "No hay nada para cambiar");
export type ReservaEdicionInput = z.infer<typeof reservaEdicionSchema>;

/** RF-R3: grupo que llega sin reserva; solo se pide la cantidad (nombre opcional, sin teléfono). */
export const walkInSchema = z.object({
  personas: reservaPublicaSchema.shape.personas,
  nombre: z.string().trim().max(80, "El nombre admite hasta 80 caracteres").optional(),
  mesaId: z.number().int().positive().optional(),
});
export type WalkInInput = z.infer<typeof walkInSchema>;

export const busquedaReservasSchema = z.object({
  q: z.string().trim().min(2, "Escribí al menos 2 letras o números").max(80),
});

export const disponibilidadQuerySchema = z.object({
  fecha: fechaIso,
  personas: z.coerce
    .number({ error: "Indicá cuántas personas son" })
    .int("Indicá un número entero de personas")
    .min(1, "Mínimo 1 persona")
    .max(40, "Podemos reservar hasta 40 personas por reserva"),
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
  // vacío solo tiene sentido en "dias_cerrados" (sin cierres): lo controla el servicio
  valor: z.string().trim().max(255),
});
export const aforoEdicionSchema = z.object({
  aforoPersonas: z.number().int().min(0).max(2000),
});
export const tipoSolicitudEdicionSchema = z.object({
  tiempoMaximoMin: z.number().int().min(1).max(240),
});
