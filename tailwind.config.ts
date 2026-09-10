import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Arco-íris pastel + unicórnio: lilás como cor principal, fundo com
        // leve tingimento lavanda, semânticas (good/bad/warn) suavizadas mas
        // ainda com contraste suficiente pra ler números em cima.
        ink: "#3D2B4F",
        surface: "#ffffff",
        canvas: "#FBF6FF",
        border: "#EEE0FA",
        muted: "#7A6690",
        brand: {
          50: "#F6F0FE",
          100: "#EBDFFD",
          400: "#B48EF0",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6425C4",
        },
        good: "#3FB88A",
        bad: "#E8607D",
        warn: "#EAA648",
        rainbow: {
          pink: "#F49AC2",
          peach: "#FFC98B",
          yellow: "#FCE28C",
          mint: "#8FE0B0",
          sky: "#8FCDF2",
          lilac: "#C6A8F0",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 12px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
