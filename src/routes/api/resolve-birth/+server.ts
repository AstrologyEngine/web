import { dev } from "$app/environment";
import { json } from "@sveltejs/kit";
import {
  resolveBirth,
  resolveInputSchema,
} from "../../../lib/server/birth/resolve";
import type { RequestHandler } from "./$types";

const headers = { "Cache-Control": "no-store" };
export const POST: RequestHandler = async ({ request, fetch, platform }) => {
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return json(
        {
          kind: "error",
          code: "EMPTY_INPUT",
          retryable: false,
        },
        { status: 400, headers },
      );
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return json(
          {
            kind: "error",
            code: "INPUT_TOO_LONG",
            retryable: false,
          },
          { status: 413, headers },
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const input = resolveInputSchema.safeParse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    if (!input.success)
      return json(
        {
          kind: "error",
          code: "INVALID_INPUT",
          retryable: false,
        },
        { status: 400, headers },
      );
    return json(
      await resolveBirth(input.data, (path) =>
        dev
          ? fetch(path)
          : platform!.env.ASSETS.fetch(new URL(path, request.url)),
      ),
      {
        headers,
      },
    );
  } catch {
    return json(
      {
        kind: "error",
        code: "TEMPORARY_FAILURE",
        retryable: true,
      },
      { status: 503, headers },
    );
  }
};
