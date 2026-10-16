import type { ReactNode } from "react";
import { fechaAr, hitoPorId, etiquetaHito } from "@dv/shared";
import type { HitoId } from "@dv/shared";

/**
 * Cartel de obra: marca sin ambigüedad lo que todavía no está construido y en qué hito se entrega
 * (línea base v4, CR-009). Si trae un prototipo, va rotulado como tal: nunca se presenta como función real.
 */
export function EnConstruccion({
  hito,
  titulo,
  descripcion,
  requisitos = [],
  compacto = false,
  prototipo,
  children,
}: {
  hito: HitoId;
  titulo: string;
  descripcion: string;
  requisitos?: string[];
  compacto?: boolean;
  /** Pantalla de muestra (H2: prototipo UX/UI). Se muestra con sello de "prototipo · datos de ejemplo". */
  prototipo?: ReactNode;
  children?: ReactNode;
}) {
  const h = hitoPorId(hito);
  const cuando = (
    <>
      Se completa en el <strong>{etiquetaHito(hito)}</strong> — <strong>{fechaAr(h.fecha)}</strong>
    </>
  );
  if (compacto)
    return (
      <aside className="obra obra--compacta" aria-label={`En construcción: ${titulo}`}>
        <span className="obra__cinta" aria-hidden="true" />
        <div>
          <p className="obra__etiqueta">
            En construcción · {etiquetaHito(hito)} — {fechaAr(h.fecha)}
          </p>
          <p className="obra__t">{titulo}</p>
          <p className="obra__d">{descripcion}</p>
        </div>
      </aside>
    );
  return (
    <section className="obra" aria-label={`En construcción: ${titulo}`}>
      <span className="obra__cinta" aria-hidden="true" />
      <div className="obra__cab">
        <p className="obra__etiqueta">En construcción</p>
        <h2 className="obra__t">{titulo}</h2>
        <p className="obra__cuando">{cuando}</p>
        <p className="obra__hito">{h.nombre}</p>
        <p className="obra__d">{descripcion}</p>
        {requisitos.length > 0 && (
          <ul className="obra__req" aria-label="Requisitos del Alcance que cubre">
            {requisitos.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
      {children}
      {prototipo && (
        <figure className="obra__proto">
          <figcaption className="obra__sello">
            Prototipo de pantalla · datos de ejemplo · todavía no funciona
          </figcaption>
          <div className="obra__proto-cuerpo" aria-hidden="true" inert>
            {prototipo}
          </div>
        </figure>
      )}
    </section>
  );
}
