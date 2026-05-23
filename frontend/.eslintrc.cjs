module.exports = {
  env: {
    browser: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module"
  },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "no-console": "off",
    "eqeqeq": ["error", "always"],
    "no-var": "error",
    "prefer-const": "warn",
    "semi": ["warn", "always"],
    "no-trailing-spaces": "warn",
    "no-multiple-empty-lines": ["warn", { "max": 2 }]
  },
  ignorePatterns: ["dist/", "node_modules/", "playwright.config.js", "tests/"]
};
