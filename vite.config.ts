import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/assets": path.resolve(__dirname, "./src/assets/"),
    },
  },
  server: {
    host: "localhost",
    port: 3000,
  },
});
