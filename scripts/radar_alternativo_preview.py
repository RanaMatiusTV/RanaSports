#!/usr/bin/env python3
"""Radar alternativo: recopila candidatos RSS sin publicar ni modificar Sheets."""
import datetime as dt
import email.utils
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Argentina/Buenos_Aires")
FEEDS = [
    ("TyC Sports", "https://www.tycsports.com/rss.xml"),
    ("ESPN Argentina", "https://www.espn.com.ar/espn/rss/news"),
    ("Infobae Deportes", "https://www.infobae.com/arc/outboundfeeds/rss/category/deportes/"),
]
OUT = "assets/radar-alternativo-preview.json"
def clean(s):
    return re.sub(r"\\s+", " ", re.sub(r"<[^>]*>", " ", s or "")).strip()
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "RanaSportsRadarPreview/1.0"})
    with urllib.request.urlopen(req, timeout=18) as response:
        return response.read(2_000_000)
def main():
    now = dt.datetime.now(TZ)
    results, errors, seen = [], [], set()
    for source, url in FEEDS:
        try:
            root = ET.fromstring(get(url))
            for item in root.findall(".//item")[:45]:
                title = clean(item.findtext("title"))
                link = (item.findtext("link") or "").strip()
                if not title or not link or link in seen:
                    continue
                seen.add(link)
                raw_date = item.findtext("pubDate")
                try:
                    published = email.utils.parsedate_to_datetime(raw_date).astimezone(TZ).isoformat()
                except (TypeError, ValueError, IndexError):
                    published = None
                enclosure = item.find("enclosure")
                photo = enclosure.get("url") if enclosure is not None and (enclosure.get("type") or "").startswith("image/") else None
                results.append({"source": source, "title": title, "url": link, "published_at": published, "description": clean(item.findtext("description"))[:450], "photo_candidate": photo, "photo_verified": False, "status": "PENDIENTE_REVISION"})
        except Exception as exc:
            errors.append({"source": source, "error": str(exc)[:180]})
    results.sort(key=lambda x: x["published_at"] or "", reverse=True)
    os.makedirs("assets", exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"generated_at": now.isoformat(), "mode": "PREVIEW_ONLY", "published": 0, "candidates": results[:100], "source_errors": errors}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Vista previa: {min(len(results),100)} candidatos, {len(errors)} fuentes con error; 0 publicaciones.")
if __name__ == "__main__":
    main()
