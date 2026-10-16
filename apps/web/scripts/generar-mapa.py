"""Genera apps/web/src/lib/mapa-datos.ts desde un volcado de OpenStreetMap (api/0.6/map).
Uso: python3 -I scripts/generar-mapa.py osm.xml
Datos © colaboradores de OpenStreetMap (ODbL). Proyección local en metros centrada en el local."""
import sys, math, json, xml.etree.ElementTree as ET

C = (-34.5319148, -58.7030733)  # Don Valentín, Av. Illia 3873 (OSM way 1463836465)
W, H = 1040, 680                # metros visibles
KX = math.cos(math.radians(C[0])) * 111320
KY = 110574
def proj(lat, lon):
    return ((lon - C[1]) * KX, -(lat - C[0]) * KY)
def dentro(x, y, m=60):
    return -W/2 - m <= x <= W/2 + m and -H/2 - m <= y <= H/2 + m

raiz = ET.parse(sys.argv[1]).getroot()
nodos = {n.get('id'): proj(float(n.get('lat')), float(n.get('lon'))) for n in raiz.iter('node')}
def pts(w):
    return [nodos[r.get('ref')] for r in w.findall('nd') if r.get('ref') in nodos]
def d(puntos):
    return 'M' + 'L'.join(f'{round(x)} {round(y)}' for x, y in puntos)
def sirve(p):
    return any(dentro(x, y) for x, y in p)

capas = {k: [] for k in ('parques', 'edificios', 'tertiary', 'calles', 'primary', 'rail')}
casa = None
etiquetas = {}
for w in raiz.iter('way'):
    tg = {x.get('k'): x.get('v') for x in w.findall('tag')}
    p = pts(w)
    if len(p) < 2 or not sirve(p):
        continue
    hw = tg.get('highway')
    if w.get('id') == '1463836465':
        casa = d(p) + 'Z'
    elif hw in ('primary', 'primary_link'):
        capas['primary'].append(d(p))
        if tg.get('name'):
            etiquetas.setdefault(tg['name'], []).append(p)
    elif hw == 'tertiary':
        capas['tertiary'].append(d(p))
        if tg.get('name'):
            etiquetas.setdefault(tg['name'], []).append(p)
    elif hw in ('residential', 'living_street', 'service', 'unclassified'):
        capas['calles'].append(d(p))
    elif tg.get('railway') == 'rail':
        capas['rail'].append(d(p))
    elif tg.get('building') and len(p) > 3 and not tg.get('name', '').startswith('Don Valent'):
        capas['edificios'].append(d(p) + 'Z')
    elif (tg.get('leisure') in ('park', 'recreation_ground', 'pitch') or tg.get('landuse') in ('grass', 'recreation_ground')) and p[0] == p[-1]:
        capas['parques'].append(d(p) + 'Z')

def etiqueta(nombre, tramos, texto):
    mejor = None; largo = 0
    for t in tramos:
        for a, b in zip(t, t[1:]):
            if dentro(*a, 0) and dentro(*b, 0):
                l = math.hypot(b[0]-a[0], b[1]-a[1])
                if l > largo: largo, mejor = l, (a, b)
    if not mejor: return None
    (ax, ay), (bx, by) = mejor
    ang = math.degrees(math.atan2(by-ay, bx-ax))
    if ang > 90: ang -= 180
    if ang < -90: ang += 180
    return {'t': texto, 'x': round((ax+bx)/2), 'y': round((ay+by)/2), 'a': round(ang), 'l': round(largo)}

etq = []
nombres = {'Avenida Presidente Arturo Umberto Illia': 'Av. Illia · Ruta 8', 'Avenida General Juan Gregorio Lemos': 'Av. Lemos',
           'Concejal Tribulato': 'Tribulato', 'Vicente López': 'Vicente López', 'Juan María Gutiérrez': 'J. M. Gutiérrez'}
for k, texto in nombres.items():
    if k in etiquetas:
        e = etiqueta(k, etiquetas[k], texto)
        if e: etq.append(e)

# puntos de interés verificados en OSM (nombre, lat, lon)
def nodo(nombre, tag=None):
    for n in raiz.iter('node'):
        tg = {x.get('k'): x.get('v') for x in n.findall('tag')}
        if tg.get('name') == nombre and (tag is None or tag in tg.values()):
            return proj(float(n.get('lat')), float(n.get('lon')))
estacion = nodo('General Lemos', 'station')
cine = nodo('Cinemark Malvinas Argentinas')
parada = nodo('Lemos / Ruta 8', 'bus_stop')
binda = nodo('Illia y Binda', 'bus_stop')
terr = None
for w in raiz.iter('way'):
    tg = {x.get('k'): x.get('v') for x in w.findall('tag')}
    if tg.get('name') == 'Terrazas de Mayo Shopping':
        p = pts(w); terr = (sum(x for x, _ in p)/len(p), sum(y for _, y in p)/len(p))
def r(p): return [round(p[0]), round(p[1])]
datos = {'w': W, 'h': H, 'capas': {k: ' '.join(v) for k, v in capas.items()}, 'casa': casa, 'etiquetas': etq,
         'poi': {'estacion': r(estacion), 'terrazas': r(terr), 'cine': r(cine), 'parada': r(parada), 'binda': r(binda)}}
out = '// Generado por scripts/generar-mapa.py desde OpenStreetMap. Datos © colaboradores de OpenStreetMap (ODbL).\n'
out += 'export const MAPA = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ' as const;\n'
open('src/lib/mapa-datos.ts', 'w').write(out)
print({k: len(v) for k, v in capas.items()}, len(out)//1024, 'KB', etq, datos['poi'])
