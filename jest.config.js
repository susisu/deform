"use strict";

module.exports = {
  roots: ["./src"],
  testMatch: ["**/*.{test,spec}.{ts,tsx}"],
  testEnvironment: "jsdom",
  collectCoverage: true,
  collectCoverageFrom: [
    "./src/**/*.{ts,tsx}",
    "!./src/**/*.{test,spec}.{ts,tsx}",
    "!./src/**/__tests__/**/*.{ts,tsx}",
  ],
  coverageDirectory: "coverage",
  globals: {
    "ts-jest": {
      tsconfig: "./tsconfig.test.json",
    },
  },
  transform: {
    "\\.tsx?$": "ts-jest",
  },
};
