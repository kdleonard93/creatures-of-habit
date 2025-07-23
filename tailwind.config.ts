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
        border: "#3F4C6B",
        input: "#2D3748",
        ring: "#F7B801",
        background: "#1A2238",
        foreground: "#F1F2EB",
        primary: {
          DEFAULT: "#FBEEC2", // Alexandria’s Lighthouse
          foreground: "#1A2238",
        },
        secondary: {
          DEFAULT: "#CE1212", // Brave red
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#00B894", // Emerald green
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#E53E3E", // Bright red
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#2D3748", // Deeper blue
          foreground: "#A0AEC0", // Muted silver
        },
        accent: {
          DEFAULT: "#4D80E4", // Royal blue
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#2A3950", // Slightly lighter than background
          foreground: "#F1F2EB",
        },
        card: {
          DEFAULT: "#2A3950", // Slightly lighter blue for cards
          foreground: "#F1F2EB",
        },
        badge: {
          DEFAULT: "#8B5CF6",
          foreground: "#FFFFFF",
        },
        icon: {
          DEFAULT: "#FBEEC2",
          foreground: "#1A2238",
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