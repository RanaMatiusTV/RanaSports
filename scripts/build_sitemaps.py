#!/usr/bin/env python3
"""Build RanaSports sitemaps from the published archive without blocking news."""
import base64
import csv
import datetime as dt
import json
import os
from pathlib import Path
import tempfile
import unicodedata
import xml.etree.ElementTree as ET

BASE = "https://ranasports.com.ar"
SM_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
NEWS_NS = "http://www.google.com/schemas/sitemap-news/0.9"
ET.register_namespace("", SM_NS)
ET.register_namespace("news", NEWS_NS)
ARG = dt.timezone(dt.timedelta(hours=-3))
UTC = dt.timezone.utc
REQUIRED = {"publicar", "fecha", "hora", "categoria", "titulo", "resumen"}
CATEGORY_ALIASES = {
    "otros deportes": "otros", "formula 1": "f1", "formula uno": "f1",
    "futbol argentino": "futbol", "seleccion argentina": "seleccion",
}


def load_routes():
    path = Path("assets/article-routes.js")
    if not path.is_file():
        return {}
    try:
        data = path.read_text(encoding="utf-8")
        prefix = "window.RS_ARTICLE_ROUTES="
        return json.loads(data[len(prefix):].strip().rstrip(";")) if data.startswith(prefix) else {}
    except (OSError, ValueError):
        return {}


ROUTES = load_routes()


def normalized(value):
    value = unicodedata.normalize("NFD", str(value or ""))
    return "".join(c for c in value if unicodedata.category(c) != "Mn").strip().lower()


def timestamp(row):
    value = (row["fecha"] + " " + row["hora"]).strip()
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M",
                "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            local = dt.datetime.strptime(value, fmt).replace(tzinfo=ARG)
            if local.year < 2000:
                return None
            return local
        except ValueError:
            pass
    return None


def load_articles(filename):
    with filename.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        keys = [normalized(k) for k in next(reader)]
        if not REQUIRED.issubset(keys):
            raise ValueError("Archive CSV is missing required columns")
        articles = {}
        for values in reader:
            if len(values) != len(keys):
                continue
            row = dict(zip(keys, (v.strip() for v in values)))
            if normalized(row["publicar"]) != "si":
                continue
            category = normalized(row["categoria"])
            category = CATEGORY_ALIASES.get(category, category)
            title = row["titulo"]
            if not category or not title or not row["resumen"]:
                continue
            local = timestamp(row)
            if not local:
                continue
            millis = int(local.astimezone(UTC).timestamp() * 1000)
            # Exact format of assets/news-feed.js articleURL() (UTF-8 base64url).
            identity = json.dumps([category, millis, title], ensure_ascii=False,
                                  separators=(",", ":"))
            token = base64.urlsafe_b64encode(identity.encode("utf-8")).decode("ascii").rstrip("=")
            url = BASE + ROUTES.get(token, "/noticia.html?n=" + token)
            articles[url] = (local, title)
    return sorted(((url, when, title) for url, (when, title) in articles.items()),
                  key=lambda article: article[1], reverse=True)


def existing_static_urls(filename):
    root = ET.parse(filename).getroot()
    urls = []
    for node in root.findall(f"{{{SM_NS}}}url"):
        loc = (node.findtext(f"{{{SM_NS}}}loc") or "").strip()
        if loc.startswith(BASE + "/") and not loc.startswith(BASE + "/noticia.html?n="):
            if loc not in urls:
                urls.append(loc)
    if not urls:
        raise ValueError("Cannot rebuild an empty static sitemap")
    return urls


def xml_bytes(root):
    return ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n"


def build_general(static_urls, articles):
    root = ET.Element(f"{{{SM_NS}}}urlset")
    for url in dict.fromkeys(static_urls + [url for url, _, _ in articles[:49000]]):
        node = ET.SubElement(root, f"{{{SM_NS}}}url")
        ET.SubElement(node, f"{{{SM_NS}}}loc").text = url
    return xml_bytes(root)


def build_news(articles, now):
    root = ET.Element(f"{{{SM_NS}}}urlset")
    cutoff = now - dt.timedelta(days=2)
    count = 0
    for url, published, title in articles:
        if count >= 1000:
            break
        if not cutoff <= published <= now + dt.timedelta(minutes=5):
            continue
        item = ET.SubElement(root, f"{{{SM_NS}}}url")
        ET.SubElement(item, f"{{{SM_NS}}}loc").text = url
        news = ET.SubElement(item, f"{{{NEWS_NS}}}news")
        pub = ET.SubElement(news, f"{{{NEWS_NS}}}publication")
        ET.SubElement(pub, f"{{{NEWS_NS}}}name").text = "RanaSports"
        ET.SubElement(pub, f"{{{NEWS_NS}}}language").text = "es"
        ET.SubElement(news, f"{{{NEWS_NS}}}publication_date").text = published.isoformat(timespec="seconds")
        ET.SubElement(news, f"{{{NEWS_NS}}}title").text = title
        count += 1
    return xml_bytes(root), count


def write_if_different(filename, content):
    if filename.exists() and filename.read_bytes() == content:
        return False
    with tempfile.NamedTemporaryFile(mode="wb", dir=filename.parent, delete=False) as tmp:
        tmp.write(content)
        tmp_name = tmp.name
    try:
        os.replace(tmp_name, filename)
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
    return True


def main():
    articles = load_articles(Path("assets/news-archive.csv"))
    static = existing_static_urls(Path("sitemap.xml"))
    sitemap = build_general(static, articles)
    news, recent = build_news(articles, dt.datetime.now(ARG))
    ET.fromstring(sitemap)
    ET.fromstring(news)
    changed_main = write_if_different(Path("sitemap.xml"), sitemap)
    changed_news = write_if_different(Path("sitemap-news.xml"), news)
    print(f"SEO sitemaps: {len(static)} static, {len(articles)} news URLs, "
          f"{recent} recent News URLs; changed: {changed_main}/{changed_news}")


if __name__ == "__main__":
    main()
