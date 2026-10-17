#!/usr/bin/env python3
"""Generate compact per-day CSV feeds for legacy /noticia.html?n=... links.
Only the relevant day is fetched by an article; the full history stays intact.
"""
import csv
import datetime as dt
import io
from collections import defaultdict
from pathlib import Path

source = Path("assets/news-archive.csv")
dest = Path("assets/news-days")
dest.mkdir(parents=True, exist_ok=True)
with source.open(encoding="utf-8-sig", newline="") as f:
    reader = csv.reader(f)
    header = next(reader)
    width = len(header)
    groups = defaultdict(list)
    for row in reader:
        if len(row) != width or row[0].strip().upper() != "SI":
            continue
        try:
            date = row[1].strip()
            time = row[2].strip()
            stamp = None
            for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M",
                        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
                try:
                    stamp = dt.datetime.strptime(f"{date} {time}", fmt)
                    break
                except ValueError:
                    continue
            if stamp is None:
                continue
            groups[stamp.date().isoformat()].append(row)
        except (IndexError, TypeError):
            continue

for day, records in groups.items():
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow(header)
    writer.writerows(records)
    path = dest / f"{day}.csv"
    payload = output.getvalue()
    if not path.exists() or path.read_text(encoding="utf-8") != payload.replace("\r\n", "\n"):
        path.write_bytes(payload.encode("utf-8"))
for stale in dest.glob("????-??-??.csv"):
    if stale.stem not in groups:
        stale.unlink()
print(f"Prepared {len(groups)} compact day feeds")
