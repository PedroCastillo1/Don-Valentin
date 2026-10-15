const MONDAY_BONUS = 5;

function groupDiscount(personas: number, esCliente: boolean): number {
  if (personas >= 10) {
    return esCliente === true ? 15 : 10;
  }
  if (personas >= 5) {
    return esCliente === true ? 8 : 5;
  }
  return 0;
}

export function calcularDescuento(personas: number, esCliente: boolean, dia: string): number {
  const mondayBonus = dia === "lunes" ? MONDAY_BONUS : 0;
  return groupDiscount(personas, esCliente) + mondayBonus;
}
