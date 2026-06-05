import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/power-flow-diagram/",
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PowerFlow",
      fileName: "powerflow",
      formats: ["es", "umd"],
    },
    // No external deps — @mdi/js icon paths are bundled in, so a single
    // <script> tag is enough in any framework or plain HTML.
  },
});
