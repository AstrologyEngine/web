import { json } from "@sveltejs/kit";
import {
  resolveBirth,
  resolveInputSchema,
} from "../../../lib/server/birth/resolve";
import type { RequestHandler } from "./$types";

const headers = { "Cache-Control": "no-store" };
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return json(
        {
          kind: "error",
          code: "INVALID_INPUT",
          message: "Enter your birth details.",
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
            code: "INVALID_INPUT",
            message: "Birth details are too long.",
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
          message: "Please check your birth details.",
          retryable: false,
        },
        { status: 400, headers },
      );
    return json(await resolveBirth(input.data, (path) => fetch(path)), {
      headers,
    });
  } catch {
    return json(
      {
        kind: "error",
        code: "TEMPORARY_FAILURE",
        message: "Unable to resolve birth details. Please try again.",
        retryable: true,
      },
      { status: 503, headers },
    );
  }
};
