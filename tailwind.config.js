/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'accent-gold': '#F4D03F',
                'accent-blue': '#3498db',
            }
        },
    },
    plugins: [],
}
