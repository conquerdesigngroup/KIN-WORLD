#!/usr/bin/env python3
"""Wrap index.html (body-only artifact page) into a standalone site in site/ for Vercel.
Run after build.py. Usage: python3 build_site.py [https://public-url]"""
import re, sys, pathlib
here = pathlib.Path(__file__).parent
url = (sys.argv[1] if len(sys.argv) > 1 else "https://lenny-turns-five.vercel.app").rstrip("/")
body = (here / "index.html").read_text()
m = re.match(r"\s*<title>.*?</title>\s*<meta name=\"claude:viewport-fit-sides\"[^>]*>\s*", body, re.S)
body = body[m.end():]
title = "Lenny is turning five · a mermaid birthday"
desc = "You’re invited! December 30, 2026 at 2:00 PM, Once Upon an Island. RSVP by 12/15."
head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#f3e7de">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}/">
<meta property="og:image" content="{url}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A7%9C%E2%80%8D%E2%99%80%EF%B8%8F%3C/text%3E%3C/svg%3E">
<style>html,body{{margin:0;padding:0}}body{{background:#f3e7de}}*,*::before,*::after{{box-sizing:border-box}}</style>
</head>
<body>
"""
out = here / "site"; out.mkdir(exist_ok=True)
(out / "index.html").write_text(head + body + "\n</body>\n</html>\n")
print("wrote", out / "index.html", (out / "index.html").stat().st_size)
