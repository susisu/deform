"use strict";

module.exports = {
  plugins: ["import", "jest", "jest-formatting", "react", "react-hooks"],
  overrides: [
    // source files
    {
      files: ["*.{ts,tsx}"],
      extends: [
        "@susisu/eslint-config/preset/ts",
        "plugin:eslint-comments/recommended",
        "plugin:import/typescript",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "prettier",
      ],
      parserOptions: {
        ecmaVersion: 2019,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      env: {
        es6: true,
        browser: true,
      },
      settings: {
        react: {
          version: "detect",
        },
      },
      rules: {
        "sort-imports": ["error", { ignoreDeclarationSort: true }],
        "eslint-comments/no-unused-disable": "error",
        "import/no-default-export": "error",
        "import/no-duplicates": "error",
        "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
        "import/order": ["error", { alphabetize: { order: "asc" } }],
        "react/prop-types": "off",
        "react/jsx-tag-spacing": [
          "error",
          {
            closingSlash: "never",
            beforeSelfClosing: "always",
            afterOpening: "never",
            beforeClosing: "never",
          },
        ],
      },
    },
    // test files
    {
      files: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
      extends: ["plugin:jest/recommended", "plugin:jest-formatting/recommended"],
      env: {
        "jest/globals": true,
      },
      rules: {
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/require-await": "off",
      },
    },
    // script files
    {
      files: ["*.js"],
      extends: [
        "@susisu/eslint-config/preset/js",
        "plugin:eslint-comments/recommended",
        "prettier",
      ],
      parserOptions: {
        ecmaVersion: 2019,
        sourceType: "script",
      },
      env: {
        es6: true,
        node: true,
      },
      rules: {
        "eslint-comments/no-unused-disable": "error",
      },
    },
  ],
};
