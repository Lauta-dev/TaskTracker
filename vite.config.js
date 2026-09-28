import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  // Prod: el ID sale de la env GAS_ID (inyectado en build).
  // Dev: se usa VITE_GAS_ID del .env.
  define: {
    __GAS_ID__: JSON.stringify(process.env.GAS_ID || ""),
  },
})
