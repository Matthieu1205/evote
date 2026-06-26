export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5", 100: "#d1fae5", 300: "#6ee7b7",
          500: "#10b981", 600: "#059669", 700: "#047857",
          800: "#065f46", 900: "#064e3b",
        },
        ink: {
          50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0",
          400: "#94a3b8", 500: "#64748b", 600: "#475569",
          700: "#334155", 900: "#0f172a",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
}
