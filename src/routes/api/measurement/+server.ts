import { measurementSchema } from "../../../lib/measurement/schema";
import type { RequestHandler } from "./$types";
const headers = { "Cache-Control": "no-store" };
export const POST: RequestHandler = async ({ request, url }) => {
  if (
    request.headers.get("origin") !== url.origin ||
    request.headers.get("content-type")?.split(";")[0] !== "application/json"
  )
    return new Response(null, { status: 403, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400, headers });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return new Response(null, { status: 413, headers });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const parsed = measurementSchema.safeParse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    if (!parsed.success) return new Response(null, { status: 400, headers });
    console.log({
      event_source: "natal_explorer_measurement_v1",
      measurement: parsed.data,
    });
    return new Response(null, { status: 204, headers });
  } catch {
    return new Response(null, { status: 400, headers });
  }
};
