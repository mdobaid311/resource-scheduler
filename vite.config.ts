import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";

export default defineConfig({
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
      external: [
        "react",
        "react-dom",
        "react-dnd",
        "react-dnd-html5-backend",
        "date-fns",
        "tailwind-merge",
        "clsx",
        "class-variance-authority",
        "@radix-ui/react-popover",
        "@radix-ui/react-select",
        "@radix-ui/react-slot",
        "@radix-ui/react-tabs",
        "lucide-react",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react-dnd": "ReactDnD",
          "react-dnd-html5-backend": "ReactDnDHTML5Backend",
          "date-fns": "dateFns",
          "tailwind-merge": "tailwindMerge",
          clsx: "clsx",
        },
      },
    },
    outDir: "dist",
    // Add CSS extraction
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});