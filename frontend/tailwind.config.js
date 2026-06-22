/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  safelist: [
    // feed 인기순 1/2/3등 배지 — RANK_CONFIG에서 동적으로 사용
    'border-yellow-400', 'bg-yellow-400', 'text-yellow-900',
    'border-gray-300',   'bg-gray-300',   'text-gray-600',
    'border-amber-600',  'bg-amber-600',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
