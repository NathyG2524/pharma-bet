import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00478d",
        primary_container: "#005eb8",
        primary_fixed: "#d6e3ff",
        secondary: "#006d39",
        secondary_container: "#91f8ae",
        on_secondary_container: "#00743c",
        tertiary: "#7d2d26",
        tertiary_fixed: "#ffdad6",
        surface: "#f3faff",
        surface_container: "#dff0fa",
        surface_container_low: "#e6f6ff",
        surface_container_lowest: "#ffffff",
        surface_container_high: "#eef6fc", // derived shift
        surface_container_highest: "#d4e5ee",
        surface_dim: "#ccdde6",
        on_surface: "#0e1e24",
        on_surface_variant: "#424752",
        outline_variant: "#c2c6d4",
      },
      boxShadow: {
        tonal: "0px 12px 32px rgba(14, 30, 36, 0.06)",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        manrope: ["var(--font-manrope)", "sans-serif"],
      },
      spacing: {
        "12": "2.75rem",
        "16": "3.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
