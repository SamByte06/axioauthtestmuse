/** @type {import('tailwindcss').Config} */
import { axioColors, axioRadius, axioFont } from "@axio-authority/ui";

export default {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: axioColors,
      borderRadius: axioRadius,
      fontFamily: {
        sans: axioFont.sans,
        mono: axioFont.mono,
      },
      boxShadow: {
        axio: "0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 3px 0 rgb(16 24 40 / 0.1)",
        "axio-md":
          "0 4px 6px -1px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.08)",
      },
    },
  },
  plugins: [],
};
