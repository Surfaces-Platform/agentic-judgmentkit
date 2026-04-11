import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./content/**/*.{md,mdx,json}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f8ff",
          100: "#ebf0fb",
          200: "#d7e1f4",
          300: "#b4c4e1",
          400: "#7d94bf",
          500: "#5c709d",
          600: "#445580",
          700: "#314062",
          800: "#202b44",
          900: "#101827",
          950: "#09111d",
        },
        sand: "#f4efe4",
        mint: "#d9f5e6",
        amber: "#f5d08b",
        coral: "#ef9f86",
      },
      boxShadow: {
        panel: "0 18px 40px rgba(16, 24, 39, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
