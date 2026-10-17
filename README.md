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

- The public page reads each section from D1 on request; if the D1 row is absent or invalid, it falls back to the corresponding checked-in JSON file.
- Saving one section stores the complete JSON object for that section, preserving unedited locale data and unrecognized fields.
- The editor supports scalar values, nested objects, arrays, item removal/reordering, and appending a new item based on the existing item shape. Use the upload control on media fields to store JPEG, PNG, WebP, GIF, MP4, or WebM files (maximum 25 MB per file).
- Content may contain HTML as existing data does. Only trusted administrators should have access to the CMS.

## Structure

- `src/data/` — canonical initial content, three locales.
- `src/lib/cms/` — content validation/loading, session signing, and editor helpers.
- `src/pages/admin/` — authenticated admin dashboard and section editor.
- `src/pages/api/cms/` — authenticated content save and media upload APIs.
- `migrations/` — D1 schema migrations.
