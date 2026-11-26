"""Recuperación preliminar de embeds: candidatos, nunca publicaciones."""
import concurrent.futures as cf
import html
import json
import re
from datetime import datetime, timedelta
from urllib.parse import urlsplit, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from ranasports_auditor import ART, PORTAL, parse, read_csv, embed_urls, norm

# Fuentes editoriales conocidas; no seguir enlaces arbitrarios ni redirects fuera de la lista.
DOMAINS = ("espn.com.ar","espn.com","tycsports.com","ole.com.ar","lanacion.com.ar",
           "clarin.com","infobae.com","afa.com.ar","formula1.com","motorsport.com",
           "tntsports.com.ar","dsports.com","uol.com.br","soloascenso.com.ar",
           "youtube.com","publish.twitter.com","tennismajors.com","elancasti.com.ar")
def allowed(url):
    try:
        p=urlsplit(url)
        h=p.hostname or ""
        return p.scheme=="https" and p.port in (None,443) and not p.username and any(h==d or h.endswith("."+d) for d in DOMAINS)
    except ValueError:
        return False
class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed(newurl):
            raise ValueError("redireccion no permitida")
        return super().redirect_request(req, fp, code, msg, headers, newurl)
def get(url, limit=2_000_000):
    if not allowed(url):
        raise ValueError("fuente fuera de lista inicial")
    req=Request(url,headers={"User-Agent":"Mozilla/5.0 RanaSports-Auditor/0.2"})
    with build_opener(SafeRedirect()).open(req,timeout=7) as response:
        return response.read(limit).decode("utf-8","replace")
PATTERNS = (
    (r'https?://(?:www\.)?(?:x\.com|twitter\.com)/([A-Za-z0-9_]+)/status/(\d+)',lambda m:f"https://x.com/{m[1]}/status/{m[2]}"),
    (r'https?://(?:(?:www\.)?youtube(?:-nocookie)?\.com/(?:watch\?v=|embed/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])',lambda m:f"https://www.youtube.com/watch?v={m[1]}"),
)
def links(page):
    page=html.unescape(page).replace(r"\/","/")
    return list(dict.fromkeys(fn(m) for p,fn in PATTERNS for m in re.finditer(p,page)))[:4]
STOP=set("para como desde hasta sobre entre ante contra tras este esta estos estas fueron con una uno del las los que por sus mas sin hoy ayer partido partidos copa final argentina".split())
def words(s):
    return {w for w in re.findall(r"[a-z0-9]+",norm(s)) if len(w)>=4 and w not in STOP}
def metadata(u):
    youtube="youtube.com" in u
    api=("https://www.youtube.com/oembed?" if youtube else "https://publish.twitter.com/oembed?")+urlencode({"url":u,"format":"json","omit_script":"true","dnt":"true"})
    d=json.loads(get(api,150_000))
    text=d.get("title","") if youtube else html.unescape(re.sub(r"<[^>]+>"," ",d.get("html","")))
    return text, d.get("author_name","")
def one(r):
    result={"titulo":r["titulo"],"fecha":r["dt"].isoformat(),"candidatos":[],"estado":""}
    src=r.get("url fuente") or r.get("url nota","")
    if not allowed(src):
        result["estado"]="fuente_no_admitida"
        return result
    try:
        found=links(get(src))
    except Exception as e:
        result["estado"]="fuente_inaccesible:"+type(e).__name__
        return result
    result["enlaces_extraidos"]=len(found)
    for u in found:
        try:
            text,author=metadata(u)
            overlap=sorted(words(r["titulo"]) & words(text+" "+author))
            if len(overlap)>=2:
                result["candidatos"].append({"url":u,"texto":text[:240],"autor":author,"coincidencias":overlap})
        except Exception:
            continue
    result["estado"]="requiere_revision_editorial" if result["candidatos"] else "sin_candidato_validado_por_metadatos"
    return result

if __name__=="__main__":
    now=datetime.now(ART)
    rows=parse(read_csv(PORTAL))
    eligible=sorted((r for r in rows if r["dt"] and now-timedelta(hours=24)<=r["dt"]<=now and not embed_urls(r) and norm(r.get("🔒 bloqueo manual",""))!="true"),key=lambda r:r["dt"],reverse=True)
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(one,eligible[:12]))
    print(json.dumps({"elegibles":len(eligible),"revisadas":len(results),"con_candidatos":sum(bool(r["candidatos"]) for r in results),"resultados":results,"publicaciones_modificadas":0},ensure_ascii=False,indent=2))
