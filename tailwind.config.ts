import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#f8f5f0",
          100: "#efeae2",
          200: "#e4ddd2",
          300: "#d3c9ba",
        },
        ink: {
          900: "#1c1915",
          700: "#433d36",
          500: "#6f675d",
        },
        clay: {
          600: "#9a3412",
          700: "#7c2d12",
        },
        pine: {
          700: "#3f6212",
          800: "#365314",
        },
      },
      fontFamily: {
        sans: ["var(--font-heebo)", "Arial", "sans-serif"],
        display: ["var(--font-frank)", "var(--font-heebo)", "serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28, 25, 21, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
