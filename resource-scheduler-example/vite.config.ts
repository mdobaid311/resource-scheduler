import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The showcase is built from the package source and the docs' recipe demos, so
// it always shows what is on main (not the last npm release) and the recipes
// exist once. The same aliases as docs/astro.config.mjs.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // The docs demos sit under docs/tsconfig.json, which extends Astro's config and is
      // not installed here. A string tsconfigRaw makes esbuild skip the tsconfig lookup.
      name: "showcase:tsconfig",
      config: () => ({
        esbuild: { tsconfigRaw: JSON.stringify({ compilerOptions: { useDefineForClassFields: true, jsx: "react-jsx" } }) },
      }),
    },
  ],
  resolve: {
    alias: {
      "@scheduler": at("../resource-scheduler/src/components/ResourceScheduler"),
      "@demos": at("../docs/src/components/demos"),
    },
    // The package source has its own node_modules; make sure React is one copy.
    dedupe: ["react", "react-dom"],
  },
  server: { fs: { allow: [at("..")] } },
});
