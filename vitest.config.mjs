export default {
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{js,mjs}'],
    // setupFiles: ['tests/vitest.setup.js'],
  },
};