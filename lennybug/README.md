# LennyBug

LennyBug is Lenny's site, a Kin World prototype with a 3D keychain menu: a chrome keyring with six charms that swing with real physics over a blue cloud sky.

- The rainbow charm opens Lenny's timeline (`#timeline`).
- The die charm opens the claw machine game (`#claw`).
- The other charms are placeholders for pages that come next.

## Layout

- `index.html` is the built, standalone page that Vercel serves. Do not edit it by hand.
- `src/template.html` is the source: all CSS, markup and JavaScript.
- `src/assets/` holds the cloud photos and the 3D lettering font that the build inlines.
- `build.py` rebuilds `index.html` from the source: `python3 build.py`.

There is no install step and no backend. Three.js loads from jsDelivr. Timeline notes are saved in the visitor's browser only.

## Deploy

This folder is its own Vercel project (`lennybug`, root directory `lennybug`) inside the Kin World repo. Pushing to `main` deploys it.
