# Kin World site

The Kin World storefront: a single page with a hero, a 4x4 gallery of sample worlds that open in a live window, how it works, why it matters, pricing and a contact form.

- `index.html` is the whole page (styles and script inline, no build step).
- `samples/<id>/` holds each playable sample world. To add one, drop its folder in, add a 800x600 thumbnail at `assets/<id>.jpg` and add an entry to `WORLDS` in `index.html` (remove one from `SOON` to keep the grid at 16).
- `api/contact.js` emails contact form submissions through Resend. Set `RESEND_API_KEY` and `CONTACT_TO` in the Vercel project's environment variables.
- Prices live in the Pricing section of `index.html`.

Pushing to `main` deploys to production on Vercel (project `kin-world`).
