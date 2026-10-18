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

`wrangler.toml` declares the Worker, D1 binding `DB`, and R2 binding `BUCKET`. Create the D1 database and media bucket in the intended Cloudflare account, then put their real IDs/names into `wrangler.toml` (never copy the IDs from another project). Apply the D1 migration before deploying:

```sh
npx wrangler d1 create ngo-nhat-truong-cms
npx wrangler r2 bucket create ngo-nhat-truong-media
npm run d1:migrate:remote
npm run deploy
```

Cloudflare CLI prints the D1 database ID; add it to the D1 binding in `wrangler.toml` before applying remote migrations. Production secrets must be configured before the CMS login will work. Deployment is a Cloudflare Worker and needs the appropriate Cloudflare account authorization.

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

