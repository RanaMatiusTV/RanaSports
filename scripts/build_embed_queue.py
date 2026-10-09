#!/usr/bin/env python3
"""Prepare a persistent, bounded embed queue. READ-ONLY against Google Sheets.

RanaSports radars own the actual K-column writes. Candidates are NOT verified
for event relevance until a radar checks the exact source article/event.
"""
import csv
import hashlib
import html
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / "assets" / "embed-queue.json"
SHEET = "12VE1D_zlnOvmIWFhdCrKAvCHh6VOwXdaYoAczDh0Fw4"
TZ = ZoneInfo("America/Argentina/Buenos_Aires")
NOW = datetime.now(TZ)
WINDOW_HOURS = 8
FETCH_LIMIT = 8
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; RanaSportsEmbedQueue/1.0)", "Accept": "text/html,application/xhtml+xml"}
SHEET_URLS = [
    "https://docs.google.com/spreadsheets/d/" + SHEET + "/gviz/tq?tqx=out:csv&sheet=Noticias",
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv",
]

def download(url, timeout=12):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read(6_000_000).decode("utf-8-sig", errors="replace")

def valid_embed(raw):
    try:
        url = urllib.parse.urlparse(html.unescape(raw.strip()))
        host = (url.hostname or "").lower()
        segments = [p for p in url.path.split("/") if p]
        if url.scheme != "https":
            return False
        if host in {"x.com", "www.x.com", "twitter.com", "www.twitter.com"}:
            return len(segments) >= 3 and segments[1] == "status" and segments[2].isdigit()
        if host in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
            qs = urllib.parse.parse_qs(url.query)
            return (url.path == "/watch" and bool(re.fullmatch(r"[\w-]{6,}", qs.get("v", [""])[0]))) or (len(segments) > 1 and segments[0] in {"shorts", "embed", "live"} and bool(re.fullmatch(r"[\w-]{6,}", segments[1])))
        if host == "youtu.be":
            return bool(segments and re.fullmatch(r"[\w-]{6,}", segments[0]))
        if host in {"formula1.com", "www.formula1.com"}:
            return bool(re.search(r"\.\d{10,}(?:\.html)?$", url.path))
        if host == "api.vodgc.net":
            return url.path.startswith("/player/v2/embed/") and len(segments) > 3
        if host == "motorsport.com" or host.endswith(".motorsport.com"):
            return len(segments) >= 2 and segments[0] == "v" and segments[1].isdigit()
    except (ValueError, TypeError):
        pass
    return False

def parse_stamp(d, t):
    for fmt in ("%d/%m/%Y %H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(d.strip() + " " + t.strip(), fmt).replace(tzinfo=TZ)
        except ValueError:
            pass
    return None

class MediaExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.found = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = (a.get("class") or "").lower()
        if tag == "blockquote" and "twitter-tweet" in cls:
            self.found.append(("blockquote", a.get("cite", "")))
        if tag in {"iframe", "video", "source", "blockquote"}:
            for k in ("src", "data-src", "data-url", "cite"):
                if a.get(k):
                    self.found.append((tag + ":" + k, a[k]))
        if tag == "meta" and a.get("property", "").lower() in {"og:video", "og:video:url", "og:video:secure_url", "twitter:player"}:
            if a.get("content"):
                self.found.append(("meta:" + a["property"], a["content"]))
        if tag == "a" and (a.get("href") or "").startswith(("https://x.com/", "https://twitter.com/", "https://youtu")):
            self.found.append(("article-link-unverified", a["href"]))

def source_candidates(text):
    parser = MediaExtractor()
    try:
        parser.feed(text)
    except Exception:
        pass
    # Find also explicitly embedded X status URLs in blockquotes/inline player code.
    patterns = [
        r"https?://(?:www\.)?(?:x\.com|twitter\.com)/[A-Za-z0-9_]+/status/\d+",
        r"https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{6,}",
    ]
    for pattern in patterns:
        for hit in re.findall(pattern, html.unescape(text), flags=re.IGNORECASE)[:8]:
            parser.found.append(("html-reference-unverified", hit))
    unique = []
    seen = set()
    for kind, raw in parser.found:
        raw = html.unescape(raw).replace("\\/", "/")
        if valid_embed(raw) and raw not in seen:
            seen.add(raw)
            unique.append({"url": raw, "evidence": kind, "validated_for_event": False})
    # Suggestions require individual editorial verification; never auto-fill K here.
    priority = {"iframe:src": 0, "iframe:data-src": 0, "blockquote:cite": 1, "meta:og:video": 2, "meta:twitter:player": 2}
    unique.sort(key=lambda c: priority.get(c["evidence"], 5))
    return unique[:5]

def sheet_rows():
    errors = []
    for url in SHEET_URLS:
        try:
            body = download(url + ("&" if "?" in url else "?") + "_=" + str(int(NOW.timestamp())))
            data = list(csv.reader(io.StringIO(body)))
            if data and len(data[0]) >= 18 and data[0][0].strip().lower() == "publicar":
                return data
            errors.append("Invalid CSV header")
        except Exception as exc:
            errors.append(type(exc).__name__ + ": " + str(exc)[:180])
    raise RuntimeError("No valid Google Sheet CSV available: " + " / ".join(errors))

def main():
    old = {}
    if QUEUE.is_file():
        try:
            old = json.loads(QUEUE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            old = {}
    old_items = {x["id"]: x for x in old.get("items", []) if x.get("id")}
    data = sheet_rows()  # Fail CLOSED if Sheet is unavailable: do not clear queue.
    items = []
    for number, values in enumerate(data[1:], start=2):
        row = (values + [""] * 18)[:18]
        if row[0].strip().upper() != "SI" or not row[4].strip() or row[17].strip().upper() in {"TRUE", "SI", "1"}:
            continue
        stamp = parse_stamp(row[1], row[2])
        if not stamp or stamp > NOW + timedelta(minutes=2) or stamp < NOW - timedelta(hours=WINDOW_HOURS):
            continue
        if valid_embed(row[10]):
            continue
        url = row[9].strip() or row[6].strip()
        ident = hashlib.sha1((row[1] + "|" + row[4] + "|" + url).encode("utf-8")).hexdigest()[:16]
        prev = old_items.get(ident, {})
        item = {
            "id": ident, "row": number, "date": row[1], "time": row[2],
            "title": row[4].strip(), "source": row[8].strip(), "source_url": url,
            "age_hours": round((NOW - stamp).total_seconds() / 3600, 2),
            "attempts": prev.get("attempts", 0),
            "last_checked": prev.get("last_checked", ""),
            "next_retry": prev.get("next_retry", ""),
            "candidates": prev.get("candidates", []),
        }
        items.append(item)
    # A pending with a verified source candidate gets priority, but older news
    # must be recovered before the 8-hour window closes.
    items.sort(key=lambda it: (-it["age_hours"], -bool(it["candidates"])))
    fetchable = [it for it in items if it["source_url"].startswith("https://") and
                 not it["candidates"] and (not it["next_retry"] or it["next_retry"] <= NOW.isoformat())]
    fetched = 0
    for item in fetchable[:FETCH_LIMIT]:
        try:
            article = download(item["source_url"], timeout=8)
            item["candidates"] = source_candidates(article)
            item["source_status"] = "inspected"
        except Exception as exc:
            item["source_status"] = type(exc).__name__
        item["attempts"] += 1
        item["last_checked"] = NOW.isoformat(timespec="seconds")
        # Back off on failed extraction, continue with other pending articles.
        wait_minutes = min(120, 20 * (2 ** min(item["attempts"] - 1, 3)))
        item["next_retry"] = (NOW + timedelta(minutes=wait_minutes)).isoformat(timespec="seconds")
        fetched += 1
    result = {
        "schema": 1, "updated_at": NOW.isoformat(timespec="seconds"),
        "timezone": "America/Argentina/Buenos_Aires", "window_hours": WINDOW_HOURS,
        "pending": len(items), "source_articles_inspected_this_run": fetched,
        "candidates_unverified": sum(bool(it["candidates"]) for it in items),
        "note": "Candidate URLs are hints, not verified embeds. Radars must check exact event, live K and R, and write K in batches.",
        "items": items
    }
    QUEUE.parent.mkdir(parents=True, exist_ok=True)
    QUEUE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Embed queue: pending=%d, source articles fetched=%d, source candidates=%d" %
          (len(items), fetched, result["candidates_unverified"]))

if __name__ == "__main__":
    main()
