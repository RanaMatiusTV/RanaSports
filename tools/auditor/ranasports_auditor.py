"""Auditor RanaSports: solo lectura, Python estándar. No publica ni modifica datos."""
import argparse
import csv
import io
import json
import unicodedata
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ART = timezone(timedelta(hours=-3))
PORTAL = 'https://ranasports.com.ar/assets/news-live.csv'
REQUIRED = ('publicar','fecha','hora','categoria','titulo','resumen','url imagen','url video')

def norm(s):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFD', s or '') if not unicodedata.combining(c)).lower().split())

def valid_url(s):
    try:
        u = urlsplit(s.strip())
        return u.scheme in ('http','https') and bool(u.hostname)
    except ValueError:
        return False

def parse(content):
    reader = csv.DictReader(io.StringIO(content.lstrip('\ufeff')), strict=True)
    if not reader.fieldnames or not set(REQUIRED) <= {norm(x) for x in reader.fieldnames}:
        raise ValueError('CSV inesperado: faltan columnas requeridas')
    rows = []
    for raw in reader:
        if None in raw or any(v is None for v in raw.values()):
            raise ValueError('CSV incompleto o fila con columnas incorrectas')
        r = {norm(k): v.strip() for k, v in raw.items()}
        if norm(r['publicar']) != 'si':
            continue
        dt = None
        for f in ('%d/%m/%Y','%Y-%m-%d'):
            for t in ('%H:%M','%H:%M:%S'):
                try:
                    dt = datetime.strptime(r['fecha']+' '+r['hora'],f+' '+t).replace(tzinfo=ART)
                except ValueError:
                    pass
        r['dt'] = dt
        rows.append(r)
    return rows

def key(r):
    return (norm(r['categoria']), r['dt'].isoformat() if r['dt'] else None, norm(r['titulo']))

def embed_urls(r):
    return [r.get(k, '') for k in ('url video', 'url video 2') if r.get(k, '')]

def audit(rows, now, hours=24, other=None):
    recent = [r for r in rows if r['dt'] and now-timedelta(hours=hours)<=r['dt']<=now]
    counts = Counter(key(r) for r in recent)
    def titles(pred):
        return [r['titulo'] for r in recent if pred(r)]
    result = {'ventana_horas':hours,'total_publicables_csv':len(rows),'noticias_en_ventana':len(recent),
        'sin_embed':titles(lambda r:not embed_urls(r)),
        'embed_url_sintaxis_invalida':titles(lambda r:bool(embed_urls(r)) and not any(map(valid_url, embed_urls(r)))),
        'sin_foto':titles(lambda r:not r['url imagen']),
        'foto_url_sintaxis_invalida':titles(lambda r:bool(r['url imagen']) and not valid_url(r['url imagen'])),
        'duplicados_exactos':[{'titulo_normalizado':k[2],'ocurrencias':v} for k,v in counts.items() if v>1],
        'filas_fecha_invalida':sum(r['dt'] is None for r in rows),
        'filas_fecha_futura':sum(bool(r['dt'] and r['dt']>now) for r in rows),
        'filas_incompletas':sum(not all(r[k] for k in ('categoria','titulo','resumen')) for r in rows),
        'ultima_fecha_hecho':max((r['dt'].isoformat() for r in rows if r['dt'] and r['dt']<=now),default=None)}
    result['cobertura_embed_url_presente_pct']=round(100*(len(recent)-len(result['sin_embed'])-len(result['embed_url_sintaxis_invalida']))/len(recent),1) if recent else None
    if other is not None:
        portal = {key(r):r for r in recent}
        origin = {key(r):r for r in other if r['dt'] and now-timedelta(hours=hours)<=r['dt']<=now}
        result['comparacion']={'solo_origen':[r['titulo'] for k,r in origin.items() if k not in portal],
            'solo_portal':[r['titulo'] for k,r in portal.items() if k not in origin],
            'diferencias_foto_o_embed':[portal[k]['titulo'] for k in portal.keys() & origin.keys() if any(portal[k].get(f,'')!=origin[k].get(f,'') for f in ('url imagen','url video','url video 2'))]}
    return result

def read_csv(source):
    if source == PORTAL:
        req=Request(source,headers={'User-Agent':'RanaSports-Auditor/0.1','Cache-Control':'no-cache'})
        with urlopen(req,timeout=25) as response:
            data=response.read(20_000_001)
        if len(data)>20_000_000:
            raise ValueError('CSV excede limite de seguridad')
        return data.decode('utf-8-sig')
    return Path(source).read_text(encoding='utf-8-sig')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--csv',default=PORTAL,help='CSV local o fuente publica del portal por defecto')
    p.add_argument('--origen',help='CSV local independiente exportado de la planilla para comparar')
    p.add_argument('--horas',type=int,default=24)
    args=p.parse_args()
    if args.horas<1: p.error('--horas debe ser positivo')
    print(json.dumps(audit(parse(read_csv(args.csv)),datetime.now(ART),args.horas,parse(read_csv(args.origen)) if args.origen else None),ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
