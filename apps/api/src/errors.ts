export class ErrorDeDominio extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly campos: Record<string, string> | undefined;
  constructor(status: number, codigo: string, mensaje: string, campos?: Record<string, string>) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
  }
}
