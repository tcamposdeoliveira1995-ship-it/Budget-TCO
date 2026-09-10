import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        surface: "#ffffff",
        canvas: "#f6f7fb",
        border: "#e6e8f0",
        muted: "#6b7280",
        brand: {
          50: "#f0fdf9",
          100: "#ccfbef",
          400: "#2dd4bf",
          500: "#0f9d8c",
          600: "#0b7d70",
          700: "#0a5f56",
        },
        good: "#0f9d58",
        bad: "#dc2626",
        warn: "#d97706",
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
