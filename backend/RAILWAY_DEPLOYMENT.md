## Railway Backend Config

Use these settings for the backend service connected to this repository.

### Source

- Repository: `ankitverma3490/nampata`
- Branch: `main`
- Root Directory: `backend`
- Watch Paths: `backend/**`

If Railway only supports a single watch path entry, use `backend/**`.
If auto-detect works better in your project, you can also leave Watch Paths empty after setting the Root Directory to `backend`.

### Build / Start

- Build Command: `npm install && npm run build`
- Start Command: `npm run start:prod`

### Required Environment Variables

```env
NODE_ENV=production
PORT=3001

FRONTEND_URL=https://business-directiry-frontend.vercel.app
CORS_ORIGIN=https://business-directiry-frontend.vercel.app,http://localhost:3000

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=huntergaming5555566@gmail.com
MAIL_PASSWORD=hbyxqtonpbvhhedu
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=huntergaming5555566@gmail.com
MAIL_FROM_NAME=naampata Support
ADMIN_EMAIL=huntergaming5555566@gmail.com

STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
```

### Frontend Vercel Variables

```env
NEXT_PUBLIC_SITE_URL=https://business-directiry-frontend.vercel.app
NEXT_PUBLIC_API_URL=https://local-business-listing-directory-production.up.railway.app/api/v1
NEXT_PUBLIC_SOCKET_URL=https://local-business-listing-directory-production.up.railway.app
```

