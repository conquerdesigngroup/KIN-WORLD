# LennyBug

LennyBug is Lenny's site, a Kin World prototype with a 3D keychain menu: a chrome keyring with eight charms that swing with real physics over a blue cloud sky. Every charm opens something.

- The rainbow charm opens Lenny's timeline (`#timeline`).
- The die charm opens the claw machine game (`#claw`).
- Five charms are small models of interactive pieces and open that piece as its own page:
  the traffic signal (`/lucky-crossing`), the disc player (`/kin-audio`), the bag of smiley balls (`/let-us-out`),
  the purple toy grenade (`/smiley-grenade`) and the flip lighter (`/flick-lighter`). Each page has a LennyBug button that goes back to the keyring.
- The "Lenny" name plate is the home charm.

## Layout

- `index.html` is the built, standalone page that Vercel serves. Do not edit it by hand.
- `src/template.html` is the source: all CSS, markup and JavaScript.
- `src/assets/` holds the cloud photos and the 3D lettering font that the build inlines.
- `build.py` rebuilds `index.html` from the source: `python3 build.py`.
- `<piece>/index.html` are the interactive pieces, each a self-contained page. To add or refresh one from its
  body-only source: `python3 build.py --piece <slug> <path to html>`, then give its charm a `page: '<slug>'` in `CHARMS`.

There is no install step and no backend. Three.js loads from jsDelivr. Timeline notes are saved in the visitor's browser only.
