const plugin = require("tailwindcss/plugin"); // Import the Tailwind plugin function
const path = require("path");

module.exports = {
  mode: 'jit', // Ensure JIT mode is enabled
  content: ["./templates/**/*.{twig,html}", "./src/**/*.{js,scss}"],
  theme: {
    extend: {
      maxWidth: {
        page: "1600px",
      },
      spacing: {
        "p-default": "1rem",
        "p-sm": "2rem",
        "p-lg": "4rem",
        // column widths for flexbox containers to conform to grid-cols-12 widths
        "flex-span-1": "8.333333%",
        "flex-span-2": "16.666667%",
        "flex-span-3": "25%",
        "flex-span-4": "33.333333%",
        "flex-span-5": "41.666667%",
        "flex-span-6": "50%",
        "flex-span-7": "58.333333%",
        "flex-span-8": "66.666667%",
        "flex-span-9": "75%",
        "flex-span-10": "83.333333%",
        "flex-span-11": "91.666667%",
        "flex-span-12": "100%",
      },
      screens: {
        "2xl": "1600px",
        "3xl": "1800px",
        "4xl": "2000px",
      },
      colors: {
        charcoal: "#333333",
        red: {
          DEFAULT: "#EB2127",
          dark: "#B7171C",
        },
        orange: {
          DEFAULT: "#F37321",
          dark: "#F04F23",
        },
        yellow: {
          DEFAULT: "#F99C1C",
          dark: "#DB8815",
        },
        green: {
          light: "#A7BA94",
          DEFAULT: "#81986A",
          dark: "#5A6D46",
        },
      },
      fontSize: {
        // H1
        "8xl": [
          "8rem",
          { lineHeight: ".9", fontWeight: "500", letterSpacing: "-0.05em" },
        ], // 130px
        // H1-smaller
        "7xl": [
          "6rem",
          { lineHeight: ".9", fontWeight: "500", letterSpacing: "-0.05em" },
        ],
        // H2
        "6xl": [
          "3.5rem",
          { lineHeight: ".9", fontWeight: "500", letterSpacing: "-0.05em" },
        ], // 60px
        "5xl": [
          "3rem",
          { lineHeight: ".9", fontWeight: "500", letterSpacing: "-0.04em" },
        ],
        "4xl": [
          "2rem",
          { lineHeight: "1.1", fontWeight: "500", letterSpacing: "-0.04em" },
        ], // 40px
        // H3
        "3xl": [
          "1.625rem",
          { lineHeight: "1.1", fontWeight: "500", letterSpacing: "-0.04em" },
        ], // 30px
        // H4
        "2xl": [
          "1.15rem",
          { lineHeight: "1.1", fontWeight: "500", letterSpacing: "-0.04em" },
        ], // 20px
        // lg
        lg: ["1.1875rem", { lineHeight: "1.75" }],
        // nav
        nav: [
          "3rem",
          { lineHeight: "1", fontWeight: "500", letterSpacing: "-0.04em" },
        ],
        'scale': 'clamp(3.25rem, 8.75vw, 8.75rem)',
      },
      letterSpacing: {
        tighter: "-.045em",
      },
      backgroundImage: {
        texture: "url('/assets/images/bg-texture.webp')",
        placeholder: "url('/assets/images/placeholder-land.webp')",
      },
      zIndex: {
        1: "1",
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
        7: "7",
        8: "8",
        9: "9",
        10: "10", // Already included by default
        20: "20",
        50: "50",
        100: "100",
        auto: "auto",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, theme }) {
      const colSpanUtilities = [...Array(12).keys()].reduce((classes, i) => {
        const col = i + 1;

        // Default paddings for different breakpoints
        const defaultPadding = theme("spacing.p-default");
        const smPadding = theme("spacing.p-sm");
        const lgPadding = theme("spacing.p-lg");

        classes[`.flex-span-${col}`] = {
          flex: `0 0 calc(${col} / 12 * 100% - ${defaultPadding})`,
          maxWidth: `calc(${col} / 12 * 100% - ${defaultPadding})`,
        };

        // Add responsive adjustments
        classes[`@screen sm`] = {
          [`.flex-span-${col}`]: {
            flex: `0 0 calc(${col} / 12 * 100% - ${smPadding})`,
            maxWidth: `calc(${col} / 12 * 100% - ${smPadding})`,
          },
        };

        classes[`@screen lg`] = {
          [`.flex-span-${col}`]: {
            flex: `0 0 calc(${col} / 12 * 100% - ${lgPadding})`,
            maxWidth: `calc(${col} / 12 * 100% - ${lgPadding})`,
          },
        };

        return classes;
      }, {});

      addUtilities(colSpanUtilities);
    }),
  ],
  safelist: [
    // page
    "page",

    // blur
    "backdrop-blur-sm",
    "backdrop-blur-md",
    "backdrop-blur-lg",
    "backdrop-blur-xl",
    "backdrop-blur-2xl",
    "blur-md",
    ...Array.from({ length: 101 }, (_, i) => `[mask:linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,1)_${i}%,rgba(0,0,0,1)_100%)]`),
    "to_top", "to_bottom", "to_right", "to_left",
    "to_top_right", "to_top_left", "to_bottom_right", "to_bottom_left",

    // horizontal scroller
    "slider-wrapper",
    "slider",

    // hover
    "hover:opacity-70",
    "opacity-70",
    

    // display
    "block",
    "hidden",
    "md:hidden",
    "sm:flex",

    //  border-radius
    "rounded-full",

    // js safe
    "translate-x-full",
    "translate-x-0",
    "translate-y-full",
    "-translate-y-full",
    "hidden",
    "absolute",
    "top-0",
    "left-0",
    "h-[60px]",
    "col-start-8",

    // gradient directions
    "bg-gradient-to-b",
    "bg-gradient-to-t",
    "bg-gradient-to-r",
    "bg-gradient-to-l",
    "bg-gradient-to-tr",
    "bg-gradient-to-tl",
    "bg-gradient-to-br",
    "bg-gradient-to-bl",

    // ✅ Safelist all text color classes (including variants like text-green-light)
    {
      pattern: /^(text|bg)-(charcoal|red|orange|yellow|green)(-(light|dark))?$/,
      variants: ["", "hover", "focus", "active", "sm", "md", "lg"],
    },

    {
      pattern: /^from-(red|white|charcoal|navy|tan)$/,
    },
    // Optional: Also safelist important versions
    "text-charcoal", "!text-charcoal",
    "text-red", "!text-red",
    "text-orange", "!text-orange",
    "text-yellow", "!text-yellow",
    "text-green", "!text-green",
    "text-green-light", "!text-green-light",
    "text-green-dark", "!text-green-dark",
    "bg-charcoal",
    "bg-red", "bg-red-dark",
    "bg-orange", "bg-orange-dark",
    "bg-yellow", "bg-yellow-dark",
    "bg-green", "bg-green-light", "bg-green-dark",
    "bg-transparent",

    // Alignment
    "justify-start",
    "justify-center",
    "justify-end", // Horizontal alignment
    "items-start",
    "items-center",
    "items-end", // Vertical alignment
    

    // text colors
    "text-charcoal",
    "text-orange",
    "text-yellow",
    "text-red",
    "text-green",
    "!text-charcoal",
    "!text-orange",
    "!text-yellow",
    "!text-red",
    "!text-green",

    // opacity gradients (from 10% to 100%)
    ...Array.from({ length: 10 }, (_, i) => `from-black/${(i + 1) * 10}`),
    ...Array.from({ length: 10 }, (_, i) => `from-white/${(i + 1) * 10}`),

    "blur-md",

    // opacity
    ...Array.from({ length: 10 }, (_, i) => `opacity-${(i + 1) * 10}`),

    // z-index
    "z-1",
    "z-2",
    "z-3",
    "z-4",
    "z-5",
    "z-6",
    "z-7",
    "z-8",
    "z-9",
    "z-10",
    "z-20",
    "z-50",
    "z-100",

    // font sizes
    "text-[18px]",

    // height (fractions and full values)
    "h-1/4",
    "h-1/3",
    "h-1/2",
    "h-2/3",
    "h-3/4",
    "h-4/5",
    "h-full",
    "!h-auto",
    "h-auto",
    'max-h-[400px]',
    'md:max-h-[500px]',
    'xl:max-h-[600px]',
    'max-h-[500px]',
    'md:max-h-[600px]',
    'xl:max-h-[700px]',
    'max-h-[600px]',
    'md:max-h-[700px]',
    'xl:max-h-[800px]',

    // width
    'max-w-screen',

    // margins needed for real estate sliders dynamically populated by js
    // other random margins used
    "mr-6",
    "ml-16",
    "mb-0",
    "!mb-0",
    "mt-60",

    // space
    "!space-y-2",
    "space-y-2",
    "!space-y-4",
    "space-y-4",
    "space-x-4",

    // grid sizes
    {
      pattern: /col-span-(1|2|3|4|5|6|7|8|9|10|11|12)/,
      variants: ["sm", "md", "lg"], // Optional responsive variants
    },
    {
      pattern: /grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)/,
      variants: ["sm", "md", "lg"], // Optional responsive variants
    },
    // flex-span rules
    {
      pattern: /flex-span-(1|2|3|4|5|6|7|8|9|10|11|12)/,
      variants: ["sm", "md", "lg"], // Optional responsive variants
    },
  ],
};
