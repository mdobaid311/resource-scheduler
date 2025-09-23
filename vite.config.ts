import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ResourceScheduler",
      formats: ["es"],
      fileName: "index",
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
  },
});
