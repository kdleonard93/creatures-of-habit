import { fontFamily } from "tailwindcss/defaultTheme";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{html,js,svelte,ts}"],
  safelist: ["dark"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#2F3A4A",
        input: "#2F3A4A",
        ring: "#D97706",
        background: "#111827",
        foreground: "#F9FAFB",
        primary: {
          DEFAULT: "#E09F3E", // Warm amber
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#64748B", // Slate gray
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#15803D", // Dark Emerald Green
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444", // Red
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#1F2937", // Dark gray
          foreground: "#9CA3AF", // Medium gray
        },
        accent: {
          DEFAULT: "#14B8A6", // Teal
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#1F2937", // Dark gray
          foreground: "#F9FAFB",
        },
        card: {
          DEFAULT: "#1F2937", // Dark gray
          foreground: "#F9FAFB",
        },
        badge: {
          DEFAULT: "#D38C3B",
          foreground: "#FFFFFF",
        },
        icon: {
          DEFAULT: "#14B8A6",
          foreground: "#FFFFFF",
        },
        easy: {
          DEFAULT: "#10B981", // Emerald green
          foreground: "#FFFFFF",
        },
        medium: {
          DEFAULT: "#F59E0B", // Amber
          foreground: "#111827",
        },
        hard: {
          DEFAULT: "#EF4444", // Red
          foreground: "#FFFFFF",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [...fontFamily.sans],
      },
    },
  },
};

export default config;