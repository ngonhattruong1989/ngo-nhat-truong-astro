# Ngô Nhật Trường — Portfolio & CMS

Astro 7 portfolio deployed as a Cloudflare Worker. Private `/admin` editor manages all ten content datasets in Vietnamese, English, and French. D1 stores published JSON by section; bundled `src/data/*.json` stays as the initial/default content. Media uploads are stored in the bound R2 bucket and served through `/media/<key>`. Use Node.js 22.22 or newer.

## Local setup

```sh
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars locally; do not commit it.
npm run d1:migrate:local
npm run dev
```

Open `http://localhost:4321/admin/login` and use the values from `.dev.vars`. The local D1/R2 state is created under `.wrangler/` and is ignored by Git.

Run checks and a production build:

```sh
npm test
npm run build
```

## Runtime settings

`.dev.vars` for local development and Cloudflare Worker secrets/vars in production:

- `ADMIN_USERNAME` — admin username (defaults to `admin` if omitted).
- `ADMIN_PASSWORD` — required password.
- `AUTH_SECRET` — required high-entropy signing secret for session cookies.

Generate a secret locally with `openssl rand -hex 32`; set it in `.dev.vars` for local use and with `npx wrangler secret put AUTH_SECRET` for production. Set `ADMIN_PASSWORD` similarly with `npx wrangler secret put ADMIN_PASSWORD`; `ADMIN_USERNAME` can be configured as a Worker variable. Never commit actual credentials.

## Cloudflare deployment

`wrangler.toml` declares the Worker, D1 binding `DB`, and R2 binding `BUCKET`. Production uses:

- D1 `ngo-nhat-truong-cms` (id in `wrangler.toml`).
- R2 bucket `public`, which owns the custom domain `public.ngonhattruong.com`. Media keys are the R2 object keys (`films/<slug>/…`), so `https://public.ngonhattruong.com/<key>` is the public URL.
- Worker routes `ngonhattruong.com/*` and `www.ngonhattruong.com/*`, so the whole site renders from D1 per request (no static rebuild needed after a CMS edit).

Deploy and seed:

```sh
export CLOUDFLARE_ACCOUNT_ID=<account that owns the zone and bucket>
npm run d1:migrate:remote
node scripts/backfill-r2.mjs --dry          # xem trước
node scripts/backfill-r2.mjs --commit r2    # đẩy media trong public/ lên R2
node scripts/backfill-r2.mjs --commit d1    # rewrite src/data sang URL R2
node scripts/seed-remote.mjs --commit       # ghi 10 section vào D1 remote
npm run deploy
```

`npm run deploy` builds and uploads both the Worker and its static assets. Production secrets (`ADMIN_PASSWORD`, `AUTH_SECRET`) are Worker secrets:

```sh
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put AUTH_SECRET
```


## Content behavior

- `/admin` is a three-level editor: overview (all pages) → block list (one card per film, painting, post…) → editor for a single block with a Word-like canvas (bold, italic, underline, font size, alignment, line height, images, video, YouTube).
- `about` and `contact` are single free-form canvases per locale; every other section is a list of blocks.
- Content lives in D1 (`cms_content`) and media in R2; the CMS never writes to `src/data/*.json`. The bundled JSON is only the fallback used when a D1 row is missing or invalid.
- Media keys are folder-scoped: `films/<slug>/<kind>/<stamp>-<name>.<ext>`, `<section>/<item-id>/<kind>/…`, `<section>/<locale>/<kind>/…`. `<kind>` ∈ poster, thumbnail, stills, bts, video, images, hero.
- Pasting an R2/public URL into any image field is supported, including legacy `/uploads/…` paths.
- Renaming the title changes the slug only when **Lưu** is pressed; the item id, the three locale copies and the R2 folder are all moved (`copyPrefix` → `deletePrefix`).
- Deleting a block removes it from all three locales and deletes its R2 folder. Invariant: what the CMS does not reference should not stay in R2.
- Limits: images 15 MB, video 60 MB (Worker memory cap). Sanitizer keeps `<video>` and YouTube `<iframe>` only.
- `PUBLIC_MEDIA_BASE_URL` (default `https://public.ngonhattruong.com`) is the public R2 domain used for previews; `/media/<key>` remains the Worker fallback in local dev.

Legacy data migration (plain text → `html`):

```sh
node scripts/migrate-v2.mjs
```

## Structure

- `src/data/` — fallback content, three locales, schema v2 (`html` per item, `html` per canvas page).
- `src/lib/cms/` — content validation/loading, session signing, media keys, slug rename, R2 helpers.
- `src/lib/render.mjs` — shared renderers (`bodyHtml`, `filmVideoHTML`, `previewItemHTML`) used by the public page and the CMS preview.
- `src/components/cms/` — React SPA (shell, lists, editors, TipTap canvas, media dialogs).
- `src/pages/admin/` — `/admin/*` SPA entry and `/admin/preview` (renders with the site CSS).
- `src/pages/api/cms/` — bootstrap, item PATCH, rename, upload, media delete.
- `migrations/` — D1 schema migrations.


## Image editing

Every image field and every gallery thumbnail has a **Chỉnh sửa ảnh** action (the ✂ button on gallery items):

- ratios: free, original, 1:1, 4:3, 3:2, 16:9, 3:4, 2:3, 9:16 — picking one centers the largest rect with that ratio;
- drag inside the box to move, drag a corner to resize (ratio locked unless "Tự do");
- export caps the long edge at 2400px and **overwrites the same R2 object**, so the URL never changes; the first crop copies the untouched bytes to `.originals/<key>` and the editor offers «Đặt lại về ảnh gốc» to put them back;
- repo assets under `/films/**`, `/uploads/**`, `/home/**` are overridden at runtime by `src/middleware.ts`: if an R2 object exists at the same key it wins over the bundled file, which is what makes in-place cropping work without touching the codebase;
- the browser cannot read R2 pixels directly (no CORS), so the editor loads bytes through `GET /api/cms/image?url=…` (session-protected, private hosts blocked).
