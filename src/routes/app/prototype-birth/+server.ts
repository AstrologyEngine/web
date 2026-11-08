// Throwaway development adapter: Vite does not expose the deployed ASSETS binding.
import { json, error } from "@sveltejs/kit";
import {
  resolveBirth,
  resolveInputSchema,
} from "../../../lib/server/birth/resolve";
import type { RequestHandler } from "./$types";
export const POST: RequestHandler = async ({ request, fetch }) => {
  if (!import.meta.env.DEV) error(404);
  const input = resolveInputSchema.parse(await request.json());
  return json(await resolveBirth(input, (path) => fetch(path)), {
    headers: { "Cache-Control": "no-store" },
  });
};
