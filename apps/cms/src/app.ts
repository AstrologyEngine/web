import { Hono } from "hono";
import { requireAdmin } from "./auth";
import type { Catalog } from "./catalog-schema";
import { cors } from "./cors";
import { contentVersion } from "./db";
import type { Bindings } from "./env";
import { apiError, isApiError, errorResponse } from "./http";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";

export type AppEnv = { Bindings: Bindings };

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const createApp = (catalog: Catalog) => {
  const app = new Hono<AppEnv>();

  app.use(cors);

  app.use(async (c, next) => {
    if (
      !READ_METHODS.has(c.req.method) &&
      !c.req.path.startsWith("/v1/admin/")
    ) {
      c.header("Allow", "GET, HEAD, OPTIONS");
      throw apiError(
        405,
        "method_not_allowed",
        "Public endpoints are read-only.",
      );
    }
    await next();
  });

  app.get("/health", async (c) => {
    const version = await contentVersion(c.env.DB);
    c.header("Cache-Control", "no-store");
    return c.json({ ok: true, version });
  });

  app.use("/v1/admin/*", requireAdmin);
  app.route("/", publicRoutes(catalog));
  app.route("/", adminRoutes(catalog));

  app.notFound((c) =>
    errorResponse(c, apiError(404, "not_found", "Not found.")),
  );

  app.onError((error, c) => {
    if (isApiError(error)) return errorResponse(c, error);
    console.error({ event: "cms_error", message: String(error) });
    return errorResponse(
      c,
      apiError(500, "internal", "Internal server error."),
    );
  });

  return app;
};
