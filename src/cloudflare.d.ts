declare module "cloudflare:workers" {
  export const env: {
    ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
  };
}
