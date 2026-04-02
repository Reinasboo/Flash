import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // New professional color palette
        primary: {
          50: "#F0F7FD",
          100: "#E0EFFC",
          200: "#C1DFF8",
          300: "#A2CFF5",
          400: "#5AAFEF",
          500: "#1B8FE0",
          600: "#0A7FD1",
          700: "#0357A4",
          800: "#02407A",
          900: "#01285A",
        },
        accent: {
          50: "#E0FFFF",
          100: "#ADFAFF",
          200: "#7BF5FF",
          300: "#48F0FF",
          400: "#16EBFF",
          500: "#00D6FF",
          600: "#00B8D4",
          700: "#009AAE",
          800: "#007C88",
          900: "#005E62",
        },
        gray: {
          50: "#F9FAFB",
          100: "#F5F7FA",
          150: "#EAECF0",
          200: "#E1E4E8",
          300: "#D4D9E0",
          400: "#B8BEC8",
          500: "#A0A8B8",
          600: "#7E8899",
          700: "#64748B",
          800: "#475569",
          900: "#1F2937",
          950: "#111827",
        },
        success: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        error: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        pending: {
          50: "#F3E8FF",
          100: "#E9D5FF",
          500: "#A78BFA",
          600: "#9333EA",
          700: "#7E22CE",
        },
      },
      backgroundColor: {
        dark: {
          50: "#1E293B",
          100: "#0F172A",
        },
      },
      backgroundImage: {
        "gradient-dark": "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        "gradient-hero": "linear-gradient(135deg, #0A7FD1 0%, #0357A4 100%)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        "inner-sm": "inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "glow-blue": "0 0 20px rgba(10, 127, 209, 0.3), 0 0 40px rgba(10, 127, 209, 0.1)",
        "glow-cyan": "0 0 20px rgba(0, 214, 255, 0.3), 0 0 40px rgba(0, 214, 255, 0.1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        spin: {
          "from": { transform: "rotate(0deg)" },
          "to": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-in-out",
        "slide-in": "slide-in 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-down": "slide-down 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionDuration: {
        DEFAULT: "300ms",
        fast: "150ms",
        slow: "500ms",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
