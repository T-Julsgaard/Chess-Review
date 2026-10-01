export default {
  test: {
    environment: 'jsdom',
    include: [
      'tests/**/*.test.js',
      'tests/integration/**/*.test.js',
    ],
    exclude: [
      'tests/**/*.test.mjs',
      'tests/helpers/**',
    ],
  },
  resolve: {
    alias: {
      './indexed-db.js': './tests/__mocks__/indexed-db.js',
    },
  },
};