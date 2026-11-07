// Build the shareable, offline demo. No runtime dependencies or server required.
const root = import.meta.dir;
const result = await Bun.build({ entrypoints: [root + '/source/demo.ts'], target: 'browser' });
if (!result.success) throw new Error(result.logs.join('\n'));
const script = await result.outputs[0].text();
const shell = await Bun.file(root + '/shell.html').text();
await Bun.write(root + '/prototype.html', shell.replace('/* DEMO_SCRIPT */', () => script));
