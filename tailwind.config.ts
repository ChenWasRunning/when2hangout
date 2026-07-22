import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211d",
        tea: "#0f766e",
        persimmon: "#b45309",
      },
    },
  },
  plugins: [],
} satisfies Config;
