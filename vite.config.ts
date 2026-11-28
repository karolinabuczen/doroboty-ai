import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { handleApi } from "./api/_lib/routes";

// Runs the same login functions that Vercel runs, so local dev and preview need no extra tools.
function localAuthApi(mode: string): Plugin {
  const middleware = async (
    req: Parameters<typeof handleApi>[0],
    res: Parameters<typeof handleApi>[1],
    next: () => void,
  ) => {
    if (!(await handleApi(req, res))) next();
  };
  return {
    name: "local-auth-api",
    config() {
      const loaded = loadEnv(mode, process.cwd(), "");
      for (const key of ["SESSION_SECRET", "AUTH_USERS"])
        if (!process.env[key] && loaded[key]) process.env[key] = loaded[key];
    },
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

// Same-origin relay for analytics (mirrors the rewrites in vercel.json) so blockers see no third-party host.
const ingestProxy = {
  "/ingest/res": {
    target: "https://eu-assets.i.posthog.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ingest\/res/, "/static"),
  },
  "/ingest/lib": {
    target: "https://eu-assets.i.posthog.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ingest\/lib/, "/array"),
  },
  "/ingest/c": {
    target: "https://eu.i.posthog.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ingest\/c\/?/, "/i/v0/e/"),
  },
  "/ingest": {
    target: "https://eu.i.posthog.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ingest/, ""),
  },
};
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), localAuthApi(mode)],
  server: { proxy: ingestProxy },
  preview: { proxy: ingestProxy },
  base: "./",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
}));
