#!/usr/bin/env python3
"""Replace hardcoded blue/slate/white Tailwind classes with semantic tokens."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src"
SKIP_NAME_PARTS = ("pdf", "docx", "login.jsx")
SKIP_FILES = {
    "Layout.jsx",
    "Login.jsx",
    "AppBrand.jsx",
    "LegalDocumentLayout.jsx",
    "LegalCopyrightLinks.jsx",
    "ThemeToggle.jsx",
}

# Longest first so we don't double-replace.
REPLACEMENTS = [
    ("hover:bg-blue-700", "hover:bg-primary/90"),
    ("hover:text-blue-700", "hover:text-primary"),
    ("hover:text-blue-600", "hover:text-primary"),
    ("focus:ring-blue-500", "focus:ring-ring"),
    ("focus-visible:ring-blue-500", "focus-visible:ring-ring"),
    ("ring-blue-500", "ring-primary"),
    ("border-blue-600", "border-primary"),
    ("border-blue-200", "border-primary/30"),
    ("border-blue-100", "border-primary/20"),
    ("bg-blue-600", "bg-primary"),
    ("bg-blue-50", "bg-primary/10"),
    ("text-blue-800", "text-primary"),
    ("text-blue-700", "text-primary"),
    ("text-blue-600", "text-primary"),
    ("text-blue-500", "text-primary"),
    ("divide-slate-200", "divide-border"),
    ("border-slate-200", "border-border"),
    ("border-slate-100", "border-border"),
    ("hover:bg-slate-100", "hover:bg-accent"),
    ("hover:bg-slate-50", "hover:bg-accent"),
    ("bg-slate-50", "bg-background"),
    ("bg-white/80", "bg-card/80"),
    ("bg-white/75", "bg-background/75"),
    ("text-slate-900", "text-foreground"),
    ("text-slate-800", "text-foreground"),
    ("text-slate-700", "text-foreground/90"),
    ("text-slate-600", "text-muted-foreground"),
    ("text-slate-500", "text-muted-foreground"),
]


def should_skip(path: Path) -> bool:
    name = path.name
    if name in SKIP_FILES:
        return True
    lowered = str(path).replace("\\", "/").lower()
    return any(part in lowered for part in SKIP_NAME_PARTS)


def replace_bg_white(text: str) -> str:
    out = []
    i = 0
    token = "bg-white"
    while True:
        j = text.find(token, i)
        if j < 0:
            out.append(text[i:])
            break
        nxt = text[j + len(token) : j + len(token) + 1]
        if nxt in ("/", "-"):
            out.append(text[i : j + len(token)])
            i = j + len(token)
            continue
        out.append(text[i:j] + "bg-card")
        i = j + len(token)
    return "".join(out)


def main() -> None:
    changed = 0
    for path in list((ROOT / "pages").rglob("*.jsx")) + list((ROOT / "components").rglob("*.jsx")):
        if should_skip(path):
            continue
        original = path.read_text(encoding="utf-8")
        text = original
        for old, new in REPLACEMENTS:
            text = text.replace(old, new)
        text = replace_bg_white(text)
        if text != original:
            path.write_text(text, encoding="utf-8")
            changed += 1
            print(path.relative_to(ROOT))
    print(f"updated {changed} files")


if __name__ == "__main__":
    main()
