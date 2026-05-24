#!/usr/bin/env python3
"""Dump the bookmark outline from the Draw Steel rulebook PDF as JSON.

Usage:
    python3 scripts/extract-pdf-toc.py [PATH_TO_PDF]

Writes JSON to skills/encounter-builder/reference/rulebook-toc.json
(creates the directory if needed). Each entry has:
    { "title": str, "page": int|None, "children": [...] }
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
    from pypdf.generic import Destination
except ImportError as exc:  # pragma: no cover
    sys.exit(f"pypdf not installed: {exc}")

DEFAULT_PDF = Path("/Users/beau/Google Drive/My Drive/TTRPG/draw steel/Draw Steel Heroes.pdf")
OUT_PATH = Path("skills/encounter-builder/reference/rulebook-toc.json")


def outline_to_tree(reader: PdfReader, items) -> list[dict]:
    tree = []
    i = 0
    while i < len(items):
        item = items[i]
        if isinstance(item, list):
            # Nested children belong to the previous entry
            if tree:
                tree[-1]["children"] = outline_to_tree(reader, item)
            i += 1
            continue
        if isinstance(item, Destination) or hasattr(item, "title"):
            title = str(item.title) if hasattr(item, "title") else str(item)
            page = None
            try:
                page = reader.get_destination_page_number(item) + 1  # 1-based
            except Exception:
                page = None
            tree.append({"title": title, "page": page, "children": []})
        i += 1
    return tree


def main() -> int:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf_path.exists():
        sys.exit(f"PDF not found: {pdf_path}")

    reader = PdfReader(str(pdf_path))
    outline = reader.outline
    tree = outline_to_tree(reader, outline)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps({
        "source": str(pdf_path),
        "page_count": len(reader.pages),
        "outline": tree
    }, indent=2) + "\n")
    print(f"Wrote outline tree to {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
