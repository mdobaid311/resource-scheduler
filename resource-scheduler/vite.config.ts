import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.tsx"],
      insertTypesEntry: true,
      rollupTypes: true,
      outDir: "dist",
      staticImport: true,
      tsconfigPath: "./tsconfig.build.json",
    }),
  ],
  build: {
    lib: {
      // `exchange` is a second entry point (resource-scheduler/exchange): file
      // format helpers that need no React, kept out of the main bundle.
      entry: {
        index: path.resolve(__dirname, "src/index.ts"),
        exchange: path.resolve(__dirname, "src/exchange.ts"),
      },
      formats: ["es", "cjs"],
      // package.json has "type": "module", so Node reads every .js file as ESM
      // and the CommonJS build has to end in .cjs.
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "esm.js" : "cjs"}`,
    },
    rollupOptions: {
      // Regexes also catch subpaths such as react/jsx-runtime. Bundling that
      // would ship React 19's JSX runtime and break React 18 consumers.
      external: [
        /^react(\/.*)?$/,
        /^react-dom(\/.*)?$/,
        /^@radix-ui\//,
        "date-fns",
        "tailwind-merge",
        "clsx",
        "class-variance-authority",
        "lucide-react",
      ],
      output: {
        // Next.js App Router: lets the package be imported from a server file.
        // Not on `exchange`: a "use client" module's functions cannot be called
        // from a server component, and those are plain functions. Code both entries share goes into
        // a chunk that the exchange entry imports, so that has no banner either.
        banner: (chunk) => (chunk.isEntry && chunk.name !== "exchange" ? '"use client";' : ""),
        // Fix CSS file naming
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'resource-scheduler.css';
          }
          return assetInfo.name || '[name][extname]';
        },
      },
    },
    outDir: "dist",
    // public/ belongs to the playground; copying it put a demo screenshot and
    // an icon into the published package.
    copyPublicDir: false,
    // Ensure CSS is extracted
    cssCodeSplit: true,
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});