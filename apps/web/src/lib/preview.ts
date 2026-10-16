// Solo para la vista previa estática (VITE_PREVIEW=1). Datos reales volcados de la API;
// la disponibilidad es una muestra y las acciones que necesitan servidor responden con un aviso honesto.
import carta from "./preview-carta.json";
import info from "./preview-info.json";
import disp from "./preview-disp.json";

export const respuestaPreview = (ruta: string, method: string): { status: number; body: unknown } => {
  if (method !== "GET") {
    return {
      status: 503,
      body: {
        error: {
          codigo: "VISTA_PREVIA",
          mensaje:
            "Esto es una vista previa estática: acá no se guardan reservas ni se inicia sesión. Eso corre en el servidor.",
        },
      },
    };
  }
  if (ruta.startsWith("/public/carta")) return { status: 200, body: carta };
  if (ruta.startsWith("/public/info")) return { status: 200, body: info };
  if (ruta.startsWith("/public/disponibilidad")) {
    const q = new URLSearchParams(ruta.split("?")[1] ?? "");
    return {
      status: 200,
      body: { ...disp, fecha: q.get("fecha") ?? disp.fecha, personas: Number(q.get("personas") ?? 2) },
    };
  }
  return { status: 401, body: { error: { codigo: "NO_AUTENTICADO", mensaje: "Sin sesión." } } };
};
