# Astrology Engine CMS

A Cloudflare Worker backed by D1 that holds all Natal Chart Explorer website copy,
per locale. The public API serves anonymous, read-only requests; the admin API
requires a Bearer token.

- Design: [`docs/designs/cms.md`](../../../docs/designs/cms.md)
- Operations (Cloudflare setup, deploys, content edits, incidents):
  [`docs/runbooks/cms.md`](../../../docs/runbooks/cms.md)

## Setup

Bun 1.3.14 and Node ≥ 22.

```sh
bun install --frozen-lockfile
bun run dev:e2e            # fresh local D1 → migrate → seed → wrangler dev on :8787
```

Or keep local data between runs:

```sh
bun run migrate:local && bun run seed:local && bun run dev
```

For admin calls locally, copy `.dev.vars.example` to `.dev.vars` (the token must
be at least 32 characters).

## Checks

```sh
bun run test          # Vitest in workerd against a real local D1
bun run check         # TypeScript (Worker and scripts)
bun run lint
bun run format:check
```

## Layout

| Path                   | Purpose                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/catalog.ts`       | Every collection and key the site may use, plus the placeholders of each `ui` text. The website type-imports it. |
| `seed/en.json`         | English text for every catalog entry; tests enforce exact parity with the catalog.                               |
| `migrations/`          | D1 schema. Additive-only.                                                                                        |
| `src/routes/public.ts` | `GET /v1/locales`, `GET /v1/content/:locale[/:collection/:key]`                                                  |
| `src/routes/admin.ts`  | Locales, translations, coverage, revisions, catalog                                                              |
| `src/locales.ts`       | Language-tag rules and fallback chains, shared with the website                                                  |
| `scripts/seed.ts`      | Inserts missing seed rows (`--local` or `--env <env>`); never overwrites edits                                   |
| `scripts/dev-e2e.ts`   | Fresh seeded local CMS, optionally with a `--fixture` of extra locales (used by Playwright)                      |

## API quick reference

Public (no auth; cacheable, `ETag: "v<content version>"`):

```sh
curl localhost:8787/health
curl localhost:8787/v1/locales
curl localhost:8787/v1/content/en
curl localhost:8787/v1/content/en/body/SUN
```

Admin (`Authorization: Bearer $CMS_ADMIN_TOKEN`; optional `X-CMS-Actor: <name>`):

| Method & path                                                                                 | Purpose                                                                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /v1/admin/locales` · `POST /v1/admin/locales` · `PATCH`/`DELETE /v1/admin/locales/:code` | Manage locales (new ones start disabled)                                        |
| `GET /v1/admin/entries/:collection/:key`                                                      | All stored translations of an entry                                             |
| `PUT`/`DELETE /v1/admin/entries/:collection/:key/translations/:locale`                        | Edit text (`If-Match: "r<n>"` or `If-None-Match: *` for concurrency)            |
| `GET /v1/admin/coverage`                                                                      | Missing, fallback-served and placeholder-mismatched entries per locale; orphans |
| `GET /v1/admin/revisions`                                                                     | History, newest first (`collection`, `key`, `locale`, `before`, `limit`)        |
| `GET /v1/admin/catalog`                                                                       | The catalog                                                                     |

Field shapes: `body`, `angle`, `sign` and `aspect` take
`{ name, insight, keywords }`; `house` takes `{ insight, keywords }`; `ui` takes
`{ text }`, where `text` must contain exactly the catalog's `{placeholders}`.

## Adding copy

Keys are defined in code:

1. Add the key to `src/catalog.ts`, declaring any placeholders.
2. Add its English text to `seed/en.json`. `bun run test` fails until the two
   match.
3. Use it in the website with `t("your.key")`; type checks reject unknown keys.

Deploying runs the seed, which inserts the new English text without touching
existing edits. See the runbook for the order of deploy steps.
