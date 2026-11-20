/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* Thang chữ của dashboard (thay cho các giá trị text-[..px] rải rác) */
      fontSize: {
        caption: ['11px', { lineHeight: '1.35' }],
        small: ['12.5px', { lineHeight: '1.45' }],
        body: ['13px', { lineHeight: '1.45' }],
        title: ['14px', { lineHeight: '1.3' }],
        'kpi-sm': ['15px', { lineHeight: '1.25' }],
        lead: ['16px', { lineHeight: '1.3' }],
        h3: ['17px', { lineHeight: '1.3' }],
        kpi: ['21px', { lineHeight: '1.15' }],
        h1: ['22px', { lineHeight: '1.2' }],
      },
      colors: {
        pos: "hsl(var(--pos))", neg: "hsl(var(--neg))", warn: "hsl(var(--warn))", gold: "hsl(var(--gold))",
        c1: "hsl(var(--c1))", c2: "hsl(var(--c2))", c3: "hsl(var(--c3))", c4: "hsl(var(--c4))", c5: "hsl(var(--c5))", c6: "hsl(var(--c6))", c7: "hsl(var(--c7))",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
