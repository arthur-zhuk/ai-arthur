# Arthur Zhuk — Personal Space

A redesign of Arthur's existing profile-chat app. The homepage adds a responsive editorial layout, an interactive particle torus, expandable career history, résumé/contact links, and the original soundtrack. The original chat lives in an accessible modal and is loaded on demand.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Development output uses `.next-dev` so a production build can run alongside the preview.

## Full application

```sh
npm run build
npm start
```

The existing `/api/generate` integration is preserved. Configure `OPENAI_API_KEY` through your usual secure setup to enable it. Without a key, the chat displays a clear connection notice and disables questions. No credentials are included in this repository.

## Private design preview

```sh
npm run build:preview
```

This packages the production build's pre-rendered homepage and public assets into `out/`. The hosted design preview is static and intentionally disables AI requests, even if a key is present locally. It retains the profile introduction, résumé, soundtrack, contact links, and interactive homepage. To host functioning AI chat, deploy the full Next.js application with its API route and configure its secret; the static preview cannot run that route.

Profile content comes from `lib/profile-data.ts`. The visual system is in `app/portfolio.css`; the particle illustration respects reduced motion and pauses rendering when offscreen or in a hidden tab.
