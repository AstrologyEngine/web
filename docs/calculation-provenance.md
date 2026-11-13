# Calculation assets and local verification

The generated Wasm wrapper is no longer checked in. Follow the root README build
instructions to prepare it from the sibling library. The ephemeris index and
annual binary slices remain included under `static/engine/ephemeris/`.
The identities and results below record the previous integration baseline;
update them together with the runtime and test pins when adopting a rebuilt engine.

The selected calculation engine is `jacksteamdev/astrology-engine` commit `b2bd547728f31a951a1afd78dfaa94225d8c152f`. The full HDCHEB01 source data has SHA-256 `06d4c26e589207bf479dbd217fafb3e4d6c559626425b156912e39a4d859487b`, fingerprint `d83046a0`. The shipped annual index SHA-256 is `adc9ea1aea895e98f8984f7d20fce8d187bd834d6d883f5a5467f0b67437e3fe`. The freshly built wrapper WASM SHA-256 is `22c1aa9cd9b457b24521d0dc7a1e90710a9fbd29bc40040f2a359b51a59096ff`. The worker verifies the index, WASM, and selected slice before use. The library build supplies the engine source archive and license/dependency notices alongside its Wasm output.

Preserve the source archive and notices when preparing `static/engine`. The plugin's prior full/slice verification reported 4,716 birth charts and 1,570 design calculations with maximum numerical difference zero at tolerance 1e-12. This is parity with the same engine and data, not an independent astronomical-accuracy claim. `bun test verification/engine-assets.test.ts` verifies the shipped slice and wrapper hashes. This website runs astrology only.

The wheel is adapted from the approved prototype at `033b9f81524ba698ba34c379b70e1dfde731834d`, itself based on `JoyDevOrg/hd-chat-app` commit `3771c081ba41bce4818984ce999158d88902d93d`. Aspect, atmakaraka and interception policies are adapted from that source; selected engine sectors and positions remain authoritative. Private source reuse was explicitly prescribed for this implementation. Research found no root license grant for the HD or website repositories; this statement does not claim an upstream public license grant.

The standalone website uses a same-origin module worker with an in-memory controller. Its queue, generation checks, timeout, disposal and retry replace the plugin's host iframe bridge; no calculation runs on the page or server. The local browser journey and comparison evidence do not establish deployed acceptance.
