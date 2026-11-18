# Lenny's Mermaid Fifth

Animated one-page birthday invite. Edit `src/template.html`, then run `python3 build.py`
to inline the images in `src/assets/` into `index.html`.

## Deploying

`site/` is what Vercel serves (project root directory `lenny-invite/site`, no build step).
After editing `src/template.html`: `python3 build.py && python3 build_site.py`, then commit `site/`.
