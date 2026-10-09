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
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ResourceScheduler",
      formats: ["es", "cjs"],
      fileName: (format) => {
        if (format === "es") return "index.esm.js";
        if (format === "cjs") return "index.js";
        return "index.js";
      },
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
        banner: '"use client";',
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
    // Ensure CSS is extracted
    cssCodeSplit: true,
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});