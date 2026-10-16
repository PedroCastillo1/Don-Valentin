/**
 * Parrilla libre y salsas de pastas, tal como figuran en la carta entregada por el local
 * (db/data/carta.json, fuente: "Don Valentin carta.pdf"). Los precios están sin validar por el Encargado
 * (actividad 1.2.3.4). Una prueba verifica que este archivo coincida con carta.json.
 */
export const PARRILLA_LIBRE = {
  formulas: [
    {
      id: "libre-mediodia-semana",
      nombre: "Parrilla libre, lunes a viernes al mediodía",
      precioPorPersona: 41000,
    },
    {
      id: "libre-noche-finde",
      nombre: "Parrilla libre, lunes a viernes a la noche, sábados, domingos y feriados al mediodía",
      precioPorPersona: 48500,
    },
  ],
  incluye: ["Entrada", "Principal (parrilla, pastas con salsa a elección y pizzas)", "Postre"],
  postreIncluido: "1 postre por persona (flan, budín de pan, tarantela o helado)",
  menores: "Menores de 4 a 7 años abonan el 50 %.",
  reservas: ["11-3303-9516", "4664-1720"],
} as const;

export const SALSAS = {
  sinCargo: ["Fileto", "Blanca", "Pesto", "Rosa", "Bolognesa"],
  adicionales: {
    precio: 5000,
    items: ["Parisiene", "Crema", "Scarparo", "Cuatro quesos", "Putanesca", "Fellini JMF"],
  },
  adicionalEstofado: 8000,
} as const;
