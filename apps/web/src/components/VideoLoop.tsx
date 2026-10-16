import { useEffect, useRef } from "react";

/** Video mudo en bucle que solo se carga y reproduce mientras está en pantalla. Sin movimiento: queda el póster. */
export function VideoLoop({
  src,
  poster,
  className,
  label,
}: {
  src: string;
  poster: string;
  className?: string;
  /** Descripción para lectores de pantalla; si falta, el video se trata como decorativo. */
  label?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const quieto =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (quieto) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          if (!v.getAttribute("src")) v.setAttribute("src", src);
          v.play().catch(() => undefined);
        } else v.pause();
      },
      { rootMargin: "120px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      disablePictureInPicture
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
