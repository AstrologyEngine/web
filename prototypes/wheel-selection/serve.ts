// Throwaway local review server. This artifact is not an application route.
import './build.ts';
const html = Bun.file(new URL('./prototype.html', import.meta.url));
const server = Bun.serve({
  hostname: '127.0.0.1', port: Number(process.env.PROTOTYPE_PORT || 5191),
  fetch: () => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
});
console.log(`Mobile comparison: ${server.url}prototypes/wheel-selection/prototype.html?variant=A&chart=true-whole&scenario=overflow`);
