import type { Bundle } from "$lib/copy/copy";

declare global {
  namespace App {
    interface Locals {
      locale: string;
    }
    interface PageData {
      locale: string;
      locales: { code: string; name: string }[];
      content: Bundle;
    }
    interface Platform {
      env: {
        ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
        CMS: {
          fetch(
            input: Request | URL | string,
            init?: RequestInit,
          ): Promise<Response>;
        };
      };
    }
  }
}
export {};
