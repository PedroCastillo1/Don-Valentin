#!/usr/bin/env bash
# Arma una vista previa que se abre con doble clic (file://), sin servidor: un solo HTML + carpeta media/.
# Uso: bash apps/web/scripts/sitio-en-un-archivo.sh <carpeta-salida>
set -euo pipefail
SAL="${1:-/tmp/sitio}"; cd "$(dirname "$0")/.."
cat > vite.single.tmp.config.ts <<'CFG'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()], base: "./", build: { outDir: "dist-archivo", emptyOutDir: true,
  assetsInlineLimit: 0, cssCodeSplit: false, modulePreload: false, rollupOptions: { output: { inlineDynamicImports: true } } } });
CFG
VITE_PREVIEW=1 npx vite build -c vite.single.tmp.config.ts >/dev/null; rm vite.single.tmp.config.ts
mkdir -p "$SAL"; cp -r dist-archivo/media "$SAL/"
python3 - "$SAL" <<'PY'
import re,base64,os,glob,sys
os.chdir("dist-archivo"); html=open("index.html").read()
c=open(glob.glob("assets/*.css")[0]).read(); j=open(glob.glob("assets/*.js")[0]).read()
def f(m):
    p=os.path.join("assets",os.path.basename(m.group(1)))
    return ("url(data:font/woff2;base64,"+base64.b64encode(open(p,"rb").read()).decode()+")") if p.endswith(".woff2") and "latin" in p else "url(data:,)"
c=re.sub(r"url\(([^)]*\.woff2?)\)",f,c)
j=re.sub(r"(?<![\w.:/])/media/","./media/",j).replace("</script","<\\/script"); c=re.sub(r"(?<![\w.:/])/media/","./media/",c)
for pat in [r'<script[^>]*src="[^"]*"[^>]*></script>',r'<link[^>]*rel="(stylesheet|preload)"[^>]*>']: html=re.sub(pat,"",html)
html=html.replace("</head>","<style>"+c+"</style></head>").replace("</body>",'<script type="module">'+j+"</script></body>")
open(os.path.join(sys.argv[1],"ABRIR-SITIO.html"),"w").write(html)
PY
rm -rf dist-archivo; echo "listo: $SAL/ABRIR-SITIO.html"
