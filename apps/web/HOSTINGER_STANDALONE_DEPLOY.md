Hostinger deploy root for the frontend is:

`apps/web/.next/standalone/apps/web`

This folder already contains:

- `server.js`
- `package.json`
- `.next/static`
- `public`
- `content`
- `.env`

Deploy steps:

1. Upload the full contents of `apps/web/.next/standalone/apps/web`.
2. Set the Node.js app startup file to `server.js`.
3. Set `PORT` from Hostinger's Node app panel if required.
4. Make sure the domain points to this Node app, not a static public_html upload.

Important:

- Do not upload `apps/web/out` for the main site anymore.
- Do not rely on Netlify `_redirects` on Hostinger.
- Direct routes like `/business/<slug>` now depend on the Node app build, not static export fallbacks.
