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
        ring: "#FBEEC2",
        background: "#1A2238",
        foreground: "#F1F2EB",
        primary: {
          DEFAULT: "#FBEEC2", // Alexandria’s Lighthouse
          foreground: "#1A2238",
        },
        secondary: {
          DEFAULT: "#E57373", // Soft coral red
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#81C784", // Soft sage green
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF9A9A", // Soft rose red
          foreground: "#1A2238",
        },
        muted: {
          DEFAULT: "#2D3748", // Deeper blue (keep as is)
          foreground: "#A0AEC0", // Muted silver (keep as is)
        },
        accent: {
          DEFAULT: "#90CAF9", // Soft sky blue
          foreground: "#1A2238",
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
        },
        easy: {
          DEFAULT: "#A5D6A7", // Soft mint green
          foreground: "#1A2238",
        },
        medium: {
          DEFAULT: "#FFB74D", // Soft peach amber
          foreground: "#1A2238",
        },
        hard: {
          DEFAULT: "#fc7979", // Soft coral red
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