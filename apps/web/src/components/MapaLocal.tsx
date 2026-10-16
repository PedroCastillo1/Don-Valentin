import { useCallback, useEffect, useRef, useState } from "react";
import { MAPA } from "../lib/mapa-datos.ts";
import { REFERENCIAS, type Referencia } from "../lib/ubicacion.ts";
import "../styles/mapa.css";

interface Vista {
  cx: number;
  cy: number;
  w: number;
}
type Nivel = "cerca" | "zona";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sinMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Calcula el encuadre (en metros) para un tamaño de contenedor, un nivel de zoom y una referencia opcional. */
function encuadre(cw: number, ch: number, nivel: Nivel, ref: Referencia | null): Vista {
  const asp = cw / ch;
  if (ref) {
    const [x, y] = ref.xy;
    const w = Math.min(1000, Math.max(300, Math.abs(x) * 1.9, Math.abs(y) * 1.9 * asp, 220 * asp));
    return { cx: x / 2, cy: y / 2, w };
  }
  if (nivel === "cerca") return { cx: 0, cy: 0, w: Math.min(420, 280 * asp) };
  return { cx: 0, cy: 0, w: Math.min(1000, 660 * asp) };
}

/**
 * Mapa propio de Don Valentín: calles, vías y edificios reales de OpenStreetMap (© colaboradores de OpenStreetMap),
 * dibujados con los colores de la marca. No es navegable: para la ruta se abre Google Maps.
 */
export function MapaLocal({
  controles = true,
  nivelInicial = "zona",
  seleccion,
  onSeleccion,
}: {
  controles?: boolean;
  nivelInicial?: Nivel;
  seleccion?: Referencia["id"] | null;
  onSeleccion?: (id: Referencia["id"] | null) => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ w: 800, h: 520 });
  const [nivel, setNivel] = useState<Nivel>(nivelInicial);
  const [vista, setVista] = useState<Vista>(() => encuadre(800, 520, nivelInicial, null));
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  const anim = useRef(0);
  const ref = REFERENCIAS.find((r) => r.id === seleccion) ?? null;

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setTam({ w: r.width, h: r.height });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const volar = useCallback((destino: Vista) => {
    cancelAnimationFrame(anim.current);
    if (sinMovimiento()) {
      setVista(destino);
      return;
    }
    const desde = vistaRef.current;
    const t0 = performance.now();
    const paso = (t: number) => {
      const k = ease(Math.min(1, (t - t0) / 650));
      setVista({
        cx: desde.cx + (destino.cx - desde.cx) * k,
        cy: desde.cy + (destino.cy - desde.cy) * k,
        w: desde.w + (destino.w - desde.w) * k,
      });
      if (k < 1) anim.current = requestAnimationFrame(paso);
    };
    anim.current = requestAnimationFrame(paso);
  }, []);

  useEffect(() => {
    volar(encuadre(tam.w, tam.h, nivel, ref));
    return () => cancelAnimationFrame(anim.current);
  }, [tam.w, tam.h, nivel, ref, volar]);

  const h = (vista.w * tam.h) / tam.w;
  const mpp = vista.w / tam.w; // metros por píxel de pantalla
  const px = (n: number) => n * mpp;
  const barraM = mpp * 90 > 100 ? 100 : mpp * 90 > 50 ? 50 : 20;

  return (
    <div className="mapa" ref={caja}>
      <svg
        className="mapa__svg"
        viewBox={`${vista.cx - vista.w / 2} ${vista.cy - h / 2} ${vista.w} ${h}`}
        role="img"
        aria-label="Mapa de los alrededores de Don Valentín, sobre la Av. Illia, cerca del cruce con la Av. Lemos"
      >
        <rect
          className="mapa__tierra"
          x={vista.cx - vista.w / 2 - 50}
          y={vista.cy - h / 2 - 50}
          width={vista.w + 100}
          height={h + 100}
        />
        <path className="mapa__parque" d={MAPA.capas.parques} />
        <path className="mapa__edificio" d={MAPA.capas.edificios} />
        <path className="mapa__calle" d={MAPA.capas.calles} />
        <path className="mapa__terciaria" d={MAPA.capas.tertiary} />
        <path className="mapa__riel" d={MAPA.capas.rail} />
        <path className="mapa__principal-borde" d={MAPA.capas.primary} />
        <path className="mapa__principal" d={MAPA.capas.primary} />
        <path className="mapa__casa" d={MAPA.casa ?? ""} />

        {MAPA.etiquetas.map((e) => (
          <text
            key={e.t}
            className="mapa__via"
            x={e.x}
            y={e.y}
            fontSize={px(e.l > 150 ? 11 : 10)}
            transform={`rotate(${e.a} ${e.x} ${e.y})`}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {e.t}
          </text>
        ))}

        {ref && (
          <g className="mapa__camino" aria-hidden="true">
            <line
              x1={0}
              y1={0}
              x2={ref.xy[0]}
              y2={ref.xy[1]}
              strokeWidth={px(2)}
              strokeDasharray={`${px(6)} ${px(5)}`}
            />
            <text
              x={ref.xy[0] / 2}
              y={ref.xy[1] / 2 - px(8)}
              fontSize={px(11)}
              textAnchor="middle"
              className="mapa__dist"
            >
              ≈ {ref.metros} m
            </text>
          </g>
        )}

        {REFERENCIAS.map((r) => {
          const activa = r.id === seleccion;
          return (
            <g
              key={r.id}
              className={`mapa__poi${activa ? " mapa__poi--on" : ""}`}
              transform={`translate(${r.xy[0]} ${r.xy[1]})`}
            >
              <circle r={px(activa ? 7 : 5)} />
              <text
                x={r.xy[0] - vista.cx > vista.w * 0.16 ? -px(10) : px(10)}
                y={0}
                fontSize={px(11)}
                dominantBaseline="central"
                textAnchor={r.xy[0] - vista.cx > vista.w * 0.16 ? "end" : "start"}
                className="mapa__poi-t"
              >
                {r.nombre.replace("Shopping ", "").replace("Parada ", "")}
              </text>
            </g>
          );
        })}

        <g className="mapa__pin" aria-hidden="true">
          <circle className="mapa__pulso" r={px(10)} />
          <circle className="mapa__pin-c" r={px(8)} />
          <g transform={`translate(${px(14)} ${-px(22)})`}>
            <rect className="mapa__tag" width={px(112)} height={px(22)} rx={px(2)} y={-px(11)} />
            <text x={px(8)} y={0} fontSize={px(11)} dominantBaseline="central" className="mapa__tag-t">
              DON VALENTÍN
            </text>
          </g>
        </g>
      </svg>

      <div className="mapa__escala" aria-hidden="true">
        <i style={{ width: barraM / mpp }} />
        <span>{barraM} m</span>
      </div>
      <p className="mapa__norte" aria-hidden="true">
        N
      </p>
      <p className="mapa__credito">
        Mapa a partir de datos de{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © colaboradores de OpenStreetMap
        </a>
      </p>

      {controles && (
        <div className="mapa__zoom" role="group" aria-label="Encuadre del mapa">
          <button
            type="button"
            aria-pressed={nivel === "cerca" && !ref}
            onClick={() => {
              onSeleccion?.(null);
              setNivel("cerca");
            }}
          >
            Cerca
          </button>
          <button
            type="button"
            aria-pressed={nivel === "zona" && !ref}
            onClick={() => {
              onSeleccion?.(null);
              setNivel("zona");
            }}
          >
            Zona
          </button>
        </div>
      )}
    </div>
  );
}
