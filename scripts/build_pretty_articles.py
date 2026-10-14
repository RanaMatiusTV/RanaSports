#!/usr/bin/env python3
"""Create real static sport/title article pages, without touching the news radar."""
import base64
import csv
import datetime as dt
import html
import json
from pathlib import Path
import re
from build_sitemaps import normalized, timestamp, CATEGORY_ALIASES, write_if_different

BASE = "https://ranasports.com.ar"
CUTOFF = dt.date(2026, 10, 14)
MAP = Path("assets/article-routes.js")
OUTPUT = Path("/tmp/ranasports-pretty-pages.txt")
FOLDERS = {"independiente": "futbol", "seleccion": "futbol",
           "otros": "mas-deportes", "juegos suramericanos": "juegos-suramericanos"}

def slugify(title):
    first = normalized(title).split(":", 1)[0].split(" | ", 1)[0]
    first = re.sub(r"\s+a\s+los\s+\d+\s+anos\b.*$", "", first)
    slug = re.sub(r"[^a-z0-9]+", "-", first).strip("-") or "noticia"
    return slug[:95].rsplit("-", 1)[0] if len(slug) > 95 else slug

def articles():
    with Path("assets/news-archive.csv").open(encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = [normalized(v) for v in next(reader)]
        for record in reader:
            if len(record) != len(header):
                continue
            row = dict(zip(header, (v.strip() for v in record)))
            if normalized(row.get("publicar", "")) != "si":
                continue
            category = normalized(row.get("categoria", ""))
            category = CATEGORY_ALIASES.get(category, category)
            when = timestamp(row) if row.get("fecha") and row.get("hora") else None
            if not when or when.date() < CUTOFF or not category or not row.get("titulo") or not row.get("resumen"):
                continue
            millis = int(when.timestamp() * 1000)
            identity = json.dumps([category, millis, row["titulo"]], ensure_ascii=False, separators=(",", ":"))
            token = base64.urlsafe_b64encode(identity.encode()).decode().rstrip("=")
            yield when, token, row, category

def load_map():
    if not MAP.exists():
        return {}
    raw = MAP.read_text(encoding="utf-8")
    prefix = "window.RS_ARTICLE_ROUTES="
    data = json.loads(raw[len(prefix):].strip().rstrip(";")) if raw.startswith(prefix) else {}
    return {key: val for key, val in data.items() if isinstance(val, str)
            and re.fullmatch(r"/[a-z0-9-]+/[a-z0-9-]+/", val)}

def page_markup(template, token, row, when, path):
    link = BASE + path
    title = html.escape(row["titulo"] + " | RanaSports", quote=True)
    desc = html.escape(" ".join(row["resumen"].split())[:170], quote=True)
    image_url = row.get("url imagen", "").strip()
    image_url = image_url if image_url.startswith(("https://", "http://")) else BASE + "/assets/icon-512.png"
    picture = html.escape(image_url, quote=True)
    added = ('\n<base href="/">'
             '\n<meta name="robots" content="index,follow">'
             '\n<link rel="canonical" href="' + link + '">'
             '\n<meta property="article:published_time" content="' + when.isoformat() + '">'
             '\n<meta name="twitter:image" content="' + picture + '">'
             '\n<script>window.RS_ARTICLE_ID=' + json.dumps(token) + ';</script>')
    content = template.replace("<head>", "<head>" + added, 1)
    content = content.replace("<title>Noticia | RanaSports</title>", "<title>" + title + "</title>", 1)
    content = content.replace('name="description" content="Noticias de RanaSports. Creado por @RanaMatiusTV."',
                              'name="description" content="' + desc + '"', 1)
    content = content.replace('property="og:title" content="Noticia | RanaSports"',
                              'property="og:title" content="' + title + '"', 1)
    content = content.replace('property="og:description" content="Noticias de RanaSports."',
                              'property="og:description" content="' + desc + '"', 1)
    content = content.replace('property="og:url" content="https://ranasports.com.ar/noticia.html"',
                              'property="og:url" content="' + link + '"', 1)
    content = content.replace('property="og:image" content="https://ranasports.com.ar/assets/icon-512.png"',
                              'property="og:image" content="' + picture + '"', 1)
    content = content.replace('content="summary"', 'content="summary_large_image"', 1)
    return content.encode("utf-8")

def main():
    template = Path("noticia.html").read_text(encoding="utf-8")
    mapping = load_map()
    used = set(mapping.values())
    touched = []
    for when, token, row, category in sorted(articles(), key=lambda item: (item[0], item[1])):
        if token not in mapping:
            sport = FOLDERS.get(category, category)
            sport = re.sub(r"[^a-z0-9-]+", "-", sport).strip("-") or "mas-deportes"
            slug = slugify(row["titulo"])
            path = f"/{sport}/{slug}/"
            if path in used:
                path = f"/{sport}/{slug}-{when.strftime('%Y%m%d-%H%M')}/"
            if path in used:
                path = f"/{sport}/{slug}-{token[:9]}/"
            mapping[token] = path
            used.add(path)
        path = mapping[token]
        dest = Path(path.lstrip("/")) / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        if write_if_different(dest, page_markup(template, token, row, when, path)):
            touched.append(str(dest))
    payload = ("window.RS_ARTICLE_ROUTES=" + json.dumps(mapping, ensure_ascii=False,
               sort_keys=True, separators=(",", ":")) + ";\n").encode("utf-8")
    write_if_different(MAP, payload)
    OUTPUT.write_text("\n".join(touched) + ("\n" if touched else ""), encoding="utf-8")
    print(f"Short URLs ready: {len(mapping)}, pages written: {len(touched)}")

if __name__ == "__main__":
    main()
