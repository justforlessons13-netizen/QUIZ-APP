import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        bungee: ["Bungee", "cursive"],
        sugo: ["Sugo", "sans-serif"],
        boldwinn: ["Boldwinn", "sans-serif"], // <-- Add this line!
      },
      colors: {
        // Arcade specific colors mapped from your new UI
        arcade: {
          neon: "#adbbff",
          bg: "#16092b",
        },
        // ... (Your existing Shadcn colors remain untouched below) ...
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        silver: "hsl(var(--silver))",
        bronze: "hsl(var(--bronze))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      boxShadow: {
        // Added custom glow effects for your buttons and text
        'arcade-glow': '0 0 25px rgba(173, 187, 255, 0.4)',
        'arcade-glow-strong': '0 0 40px rgba(173, 187, 255, 0.7)',
      },
      dropShadow: {
        'arcade-text': '0 0 15px rgba(173, 187, 255, 0.6)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
        "bob": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" }
        },
        "borderPulse": {
          "0%, 100%": {
            boxShadow: "0 0 8px hsla(185, 90%, 50%, 0.4), 0 0 20px hsla(185, 90%, 50%, 0.15)",
            borderColor: "hsl(185, 90%, 50%)"
          },
          "50%": {
            boxShadow: "0 0 16px hsla(185, 90%, 50%, 0.7), 0 0 36px hsla(185, 90%, 50%, 0.3)",
            borderColor: "hsl(185, 90%, 70%)"
          }
        },
        "iconPop": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.25)" }
        },
        "blinkSlow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "confetti": "confetti-fall 3s ease-out forwards",
        "bob": "bob 2.6s ease-in-out infinite",
        "borderPulse": "borderPulse 2s ease-in-out infinite",
        "iconPop": "iconPop 2s ease-in-out infinite",
        "blinkSlow": "blinkSlow 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;