import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Symbole aus public/icon.svg erzeugen: npm run icons
// Maskierbares und Apple-Symbol mit Hintergrund in der Symbolfarbe, damit die
// Ecken auf dem Home-Bildschirm nicht weiß werden.
const background = "#0f766e";

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background },
    },
  },
  images: ["public/icon.svg"],
});
