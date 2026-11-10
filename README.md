# Astrology Engine web

Natal Chart Explorer website built with SvelteKit, strict TypeScript, Bun and Cloudflare Workers. The current candidate supports transient birth entry, chart exploration and three astrology systems; editorial review and candidate acceptance remain pending.
Configuration foundation: web-legacy main `e00a2f9e10aa5b4f338875bc306166bfb939903c`.
Toolchain foundation: plugin main `498e21f61cde2f90760370fe826f27cc6d735d30`.

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

The [editorial review packet](docs/editorial/natal-chart-review.md) records outstanding content review. The [measurement guide](docs/beta-measurement.md) describes the local collection and reporting path and its deployment verification limits.
