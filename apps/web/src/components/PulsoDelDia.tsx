import { useMemo, useState } from "react";

export interface FranjaDia {
  id: number;
  nombre: string;
  desde: string;
  hasta: string;
  reservas: number;
  personas: number;
  aforo: number;
}

export function estadoDeAforo(personas: number, aforo: number): { texto: string; clase: string } {
  const p = aforo ? personas / aforo : 0;
  if (p >= 1) return { texto: "Completa", clase: "lleno" };
  if (p >= 0.8) return { texto: "Casi completa", clase: "casi" };
  if (p >= 0.4) return { texto: "Se está llenando", clase: "medio" };
  return { texto: "Con lugar", clase: "libre" };
}

const W = 720;
const H = 240;
const M = { l: 44, r: 20, t: 20, b: 34 };

/** Curva suave (monótona) que pasa por todos los puntos. */
function curva(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

/**
 * Pulso del día: personas reservadas por franja contra el aforo.
 * Reemplaza a las barras: muestra la forma del día, dónde hay lugar y dónde no.
 */
export function PulsoDelDia({ franjas }: { franjas: FranjaDia[] }) {
  const masCargada = useMemo(
    () => franjas.reduce((m, f, i) => (f.personas > (franjas[m]?.personas ?? -1) ? i : m), 0),
    [franjas],
  );
  const [elegida, setElegida] = useState<number | null>(null);
  const sel = elegida ?? masCargada;
  const f = franjas[sel];
  if (!f) return null;

  const tope = Math.max(10, ...franjas.map((x) => Math.max(x.aforo, x.personas))) * 1.08;
  const x = (i: number) => M.l + (franjas.length === 1 ? 0 : (i * (W - M.l - M.r)) / (franjas.length - 1));
  const y = (v: number) => M.t + (1 - v / tope) * (H - M.t - M.b);
  const pers: [number, number][] = franjas.map((fr, i) => [x(i), y(fr.personas)]);
  const aforo: [number, number][] = franjas.map((fr, i) => [x(i), y(fr.aforo)]);
  const linea = curva(pers);
  const area = `${linea} L${x(franjas.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, 0.5, 1].map((t) => Math.round((t * tope) / 1.08 / 10) * 10);
  const st = estadoDeAforo(f.personas, f.aforo);
  const pct = f.aforo ? Math.min(100, Math.round((f.personas / f.aforo) * 100)) : 0;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="pulso">
      <div className="pulso__grafico">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Personas reservadas por franja contra el aforo">
          <defs>
            <linearGradient id="pulso-rel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--brasa)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--brasa)" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="pulso__guia" />
              <text x={M.l - 10} y={y(t) + 4} textAnchor="end" className="pulso__eje">
                {t}
              </text>
            </g>
          ))}
          <path d={curva(aforo)} className="pulso__aforo" />
          <path d={area} fill="url(#pulso-rel)" />
          <path d={linea} className="pulso__linea" />
          <line x1={x(sel)} x2={x(sel)} y1={M.t} y2={y(0)} className="pulso__cruz" />
          {franjas.map((fr, i) => (
            <g key={fr.id}>
              <circle
                cx={x(i)}
                cy={y(fr.personas)}
                r={i === sel ? 7 : 4.5}
                className={i === sel ? "pulso__punto pulso__punto--sel" : "pulso__punto"}
              />
              <text
                x={x(i)}
                y={H - 10}
                textAnchor="middle"
                className={i === sel ? "pulso__hora pulso__hora--sel" : "pulso__hora"}
              >
                {fr.desde}
              </text>
            </g>
          ))}
        </svg>
        <div className="pulso__botones" role="group" aria-label="Elegir franja">
          {franjas.map((fr, i) => (
            <button
              key={fr.id}
              type="button"
              aria-pressed={i === sel}
              aria-label={`${fr.nombre}: ${fr.personas} de ${fr.aforo} personas`}
              style={{ left: `${(x(i) / W) * 100}%` }}
              onMouseEnter={() => setElegida(i)}
              onFocus={() => setElegida(i)}
              onClick={() => setElegida(i)}
            />
          ))}
        </div>
        <p className="pulso__leyenda">
          <span className="pulso__ref pulso__ref--rel" /> Personas reservadas
          <span className="pulso__ref pulso__ref--aforo" /> Aforo de la franja
        </p>
      </div>

      <div className={`pulso__detalle pulso__detalle--${st.clase}`} aria-live="polite">
        <p className="pulso__franja">{f.nombre}</p>
        <div className="anillo">
          <svg viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r={R} className="anillo__pista" />
            <circle
              cx="70"
              cy="70"
              r={R}
              className="anillo__valor"
              strokeDasharray={`${(C * pct) / 100} ${C}`}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <p>
            <b>{pct}%</b>
            <span>ocupada</span>
          </p>
        </div>
        <p className="pulso__estado">{st.texto}</p>
        <dl className="pulso__datos">
          <div>
            <dt>Personas</dt>
            <dd>
              {f.personas} <small>de {f.aforo}</small>
            </dd>
          </div>
          <div>
            <dt>Reservas</dt>
            <dd>{f.reservas}</dd>
          </div>
          <div>
            <dt>Lugar libre</dt>
            <dd>{Math.max(0, f.aforo - f.personas)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
