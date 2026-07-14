/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // iOS System Colors
        bg:          "#F2F2F7",
        surface:     "#FFFFFF",
        ink:         "#1C1C1E",
        secondary:   "#8E8E93",
        separator:   "#E5E5EA",
        // Accent Colors
        green:       "#34C759",
        red:         "#FF3B30",
        blue:        "#007AFF",
        orange:      "#FF9500",
        violet:      "#AF52DE",
        teal:        "#5AC8FA",
        // Soft backgrounds
        "green-bg":  "#E8F9ED",
        "red-bg":    "#FFECEB",
        "blue-bg":   "#EBF2FF",
        "orange-bg": "#FFF4E5",
        "violet-bg": "#F5EEFA",
        // Legacy colors fallback
        paper: "#FAF7F0",
        ledger: "#1B4332",
        gold: "#B8922B",
        coral: "#B4534F",
        line: "#DCD5C4",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
        body: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "28px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1)",
        float: "0 8px 30px rgba(0,0,0,0.12)",
        "glow-blue": "0 4px 20px rgba(0,122,255,0.2)",
        "glow-green": "0 4px 20px rgba(52,199,89,0.2)",
        "glow-red": "0 4px 20px rgba(255,59,48,0.15)",
        "glow-orange": "0 4px 20px rgba(255,149,0,0.15)",
        "inner-soft": "inset 0 1px 2px rgba(0,0,0,0.06)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-gentle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--target-width)" },
        },
      },
      animation: {
        "count-up": "count-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-in-right": "slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-gentle": "pulse-gentle 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
