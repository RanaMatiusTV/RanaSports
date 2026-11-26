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
def source_candidates(r):
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


# Búsqueda independiente de la fuente original. Los resultados son candidatos,
# incluso si oEmbed responde: no certifica fecha, derechos ni pertinencia editorial.
MEDIA=("espn","sportcenter","sportscenter","tyc sports","tnt sports","dsports","ole","liga profesional","afa","formula 1","atp tour","wta")
def walk(node):
    if isinstance(node,dict):
        for k,v in node.items():
            if k in ("videoRenderer","reelItemRenderer","shortsLockupViewModel") and isinstance(v,dict):
                yield k,v
            yield from walk(v)
    elif isinstance(node,list):
        for v in node:
            yield from walk(v)
def txt(node):
    if isinstance(node,str):
        return node
    if not isinstance(node,dict):
        return ""
    return node.get("simpleText") or node.get("content") or " ".join(r.get("text","") for r in node.get("runs",[]) if isinstance(r,dict))
def parse_search(page):
    m=re.search(r'(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=)\s*',page)
    if not m:
        raise ValueError("sin datos de busqueda")
    data=json.JSONDecoder().raw_decode(page[m.end():])[0]
    results={}
    for kind,v in walk(data):
        shorts=kind!="videoRenderer"
        vid=v.get("videoId") or v.get("onTap",{}).get("innertubeCommand",{}).get("reelWatchEndpoint",{}).get("videoId")
        if not isinstance(vid,str) or not re.fullmatch(r"[A-Za-z0-9_-]{11}",vid):
            continue
        title=txt(v.get("title")) or txt(v.get("headline")) or txt(v.get("overlayMetadata",{}).get("primaryText"))
        author=txt(v.get("ownerText")) or txt(v.get("shortBylineText"))
        age=txt(v.get("publishedTimeText"))
        if title:
            results.setdefault(vid,{"url":"https://www.youtube.com/"+("shorts/"+vid if shorts else "watch?v="+vid),"title":title,"author":author,"age":age,"tipo":"short" if shorts else "video"})
    return list(results.values())
def recent_hint(age):
    # Sin fecha exacta no se afirma actualidad: solo una pista de la interfaz.
    a=norm(age)
    return bool(re.search(r"\b(?:second|minute|hour|segundo|minuto|hora)s?\b",a) or re.search(r"\b(?:1|2|a|one|un|una|two|dos)\s+(?:day|dia)s?\b",a))
def youtube_candidates(r):
    query=r["titulo"][:140]
    wanted=words(r["titulo"])
    diagnostics=[]
    candidates=[]
    for q in (query,query+" "+("ESPN SportsCenter" if "futbol" in norm(r["categoria"]) else "deportes")):
        try:
            page=get("https://www.youtube.com/results?"+urlencode({"search_query":q,"hl":"es","gl":"AR"}),4_000_000)
            entries=parse_search(page)
            diagnostics.append({"consulta":q,"resultados":len(entries)})
        except Exception as e:
            diagnostics.append({"consulta":q,"error":type(e).__name__})
            continue
        def rank(v):
            overlap=wanted & words(v["title"])
            return (len(overlap),recent_hint(v["age"]),any(m in norm(v["author"]) for m in MEDIA))
        for v in sorted(entries,key=rank,reverse=True)[:4]:
            if len(wanted & words(v["title"]))<2:
                continue
            try:
                title,author=metadata(v["url"])
                overlap=sorted(wanted & words(title))
                if len(overlap)<2:
                    continue
                candidates.append({"url":v["url"],"texto":title[:240],"autor":author,"coincidencias":overlap,"origen":"busqueda_youtube","tipo":v["tipo"],"antiguedad_indicada":v["age"],"actualidad_no_confirmada":True})
            except Exception:
                continue
        if candidates:
            break
    return candidates,diagnostics

def one(r):
    result=source_candidates(r)
    result["estado_fuente_original"]=result["estado"]
    yt,diagnostics=youtube_candidates(r)
    result["busqueda_youtube"]=diagnostics
    existing={v["url"] for v in result["candidatos"]}
    result["candidatos"].extend(v for v in yt if v["url"] not in existing)
    result["estado"]="requiere_revision_editorial" if result["candidatos"] else "sin_candidato_validado_por_metadatos"
    return result


if __name__=="__main__":
    now=datetime.now(ART)
    rows=parse(read_csv(PORTAL))
    eligible=sorted((r for r in rows if r["dt"] and now-timedelta(hours=24)<=r["dt"]<=now and not embed_urls(r) and norm(r.get("🔒 bloqueo manual",""))!="true"),key=lambda r:r["dt"],reverse=True)
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(one,eligible[:12]))
    print(json.dumps({"elegibles":len(eligible),"revisadas":len(results),"con_candidatos":sum(bool(r["candidatos"]) for r in results),"resultados":results,"publicaciones_modificadas":0},ensure_ascii=False,indent=2))
