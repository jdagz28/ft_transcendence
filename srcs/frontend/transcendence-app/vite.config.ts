import { defineConfig } from "vite"
import { fileURLToPath, URL } from "node:url"
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [    tailwindcss(),  ]
});
