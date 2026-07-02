/** @type {import('tailwindcss').Config} */
module.exports = {
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
        // Soft backgrounds
        "green-bg":  "#E8F9ED",
        "red-bg":    "#FFECEB",
        "blue-bg":   "#EBF2FF",
        "orange-bg": "#FFF4E5",
        // Legacy colors fallback (in case they are referenced somewhere else or just to be safe)
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
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.1)",
        float: "0 8px 30px rgba(0,0,0,0.12)",
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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "count-up": "count-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
