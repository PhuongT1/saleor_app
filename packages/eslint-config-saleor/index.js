module.exports = {
  extends: ["next", "turbo", "prettier"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "off",
    "import/no-default-export": "error",
    "newline-after-var": "warn",
    "multiline-comment-style": ["warn", "starred-block"],
    "no-console": "error",
  },
  parserOptions: {
    babelOptions: {
      presets: [require.resolve("next/babel")],
    },
  },
  overrides: [
    {
      files: ["src/pages/**/*", "src/pages/api/**/*", "vitest.config.ts", "generated/graphql.ts"],
      rules: {
        "import/no-default-export": "off",
      },
    },
    {
      files: ["next.config.js"],
      rules: {
        "import/no-default-export": "off",
      },
    },
    {
      files: ["tests/**/*", "src/release-utils.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
  ignorePatterns: ["next-env.d.ts"],
};
