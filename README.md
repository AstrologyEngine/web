# Astrology Engine web

Natal Chart Explorer website built with SvelteKit, strict TypeScript, Bun and Cloudflare Workers. The current candidate supports transient birth entry, chart exploration and three astrology systems; editorial review and candidate acceptance remain pending.

## Development

Use Node 24.10.0 and Bun 1.3.14.

```sh
bun install --frozen-lockfile
bun run sync
bun run dev
```

Before committing: `bun run check`, `bun run check:ts`, `bun run lint`,
`bun run format:check`, `bun run build`, both environment dry runs, and
`bun run test:browser` (install Chromium with `bunx playwright install chromium`).
