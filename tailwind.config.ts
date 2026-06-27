import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Design system "Graphite & Neon" — variabili semantiche.
      colors: {
        "subsync-bg": "#18181B",
        "subsync-card": "#27272A",
        "subsync-purple": "#8B5CF6",
        "subsync-cyan": "#06B6D4",
      },
    },
  },
  plugins: [],
};

export default config;
