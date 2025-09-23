import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ResourceScheduler",
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ["react", "react-dom", "react-dnd", "react-dnd-html5-backend"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react-dnd": "ReactDnD",
          "react-dnd-html5-backend": "ReactDnDHTML5Backend"
        },
      },
    },
    outDir: "dist",
  },
});