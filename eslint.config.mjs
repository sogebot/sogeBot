import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import stylistic from '@stylistic/eslint-plugin'
import _import from "eslint-plugin-import";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["**/webpack.config.js", "tools/*", "test/*"],
}, ...fixupConfigRules(compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/typescript",
)), {
    plugins: {
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
        import: fixupPluginRules(_import),
        '@stylistic': stylistic,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.mocha,
        },

        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            parser: "@typescript-eslint/parser",

            ecmaFeatures: {
                jsx: true,
            },

            useJSXTextNode: true,
            project: ["./tsconfig.eslint.json"],
            tsconfigRootDir: "./",
            extraFileExtensions: [".vue"],
        },
    },

    settings: {
        "import/resolver": {
            node: {
                paths: ["src/"],
            },
        },

        "import/internal-regex": "^src/",
    },

    rules: {
        indent: "off",
        '@stylistic/indent': ['error', 2],

        "key-spacing": ["error", {
            beforeColon: false,
            afterColon: true,
            align: "value",
        }],

        "object-curly-spacing": ["error", "always"],

        "object-curly-newline": ["error", {
            consistent: true,
        }],

        "@typescript-eslint/no-unused-vars": ["warn", {
            vars: "all",
            varsIgnorePattern: "^_",
            args: "after-used",
            argsIgnorePattern: "^_",
        }],

        "no-multiple-empty-lines": ["error", {
            max: 1,
            maxEOF: 0,
            maxBOF: 0,
        }],

        "import/order": ["warn", {
            groups: ["builtin", "external", ["internal"], ["parent", "sibling"], "index"],
            "newlines-between": "always",

            alphabetize: {
                order: "asc",
                caseInsensitive: true,
            },

            pathGroups: [{
                pattern: "src/**",
                group: "internal",
                position: "after",
            }],
        }],

        "import/no-cycle": [2, {
            maxDepth: 1,
        }],

        "import/newline-after-import": ["error", {
            count: 1,
        }],

        "no-shadow": "off",
        "@typescript-eslint/no-shadow": ["error"],
        "@typescript-eslint/explicit-member-accessibility": "off",

        quotes: ["error", "single", {
            allowTemplateLiterals: true,
        }],

        "@typescript-eslint/camelcase": "off",
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-expressions": "off",
        "no-constant-binary-expression": "off",
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/no-use-before-define": 0,
        "@typescript-eslint/class-name-casing": 0,
        "@typescript-eslint/prefer-interface": 0,
        "@typescript-eslint/no-namespace": 0,
        "interface-over-type-literal": 0,
        "@typescript-eslint/no-var-requires": 1,
        "@typescript-eslint/no-inferrable-types": 0,
        semi: "off",
        "@stylistic/semi": ["error"],
        curly: ["error"],

        "prefer-const": ["error", {
            destructuring: "all",
            ignoreReadBeforeAssign: false,
        }],

        "no-var": 2,
        "prefer-spread": "error",
        "comma-dangle": [2, "always-multiline"],
        "dot-notation": 2,
        "operator-linebreak": ["error", "before"],
        "brace-style": "error",
        "no-useless-call": "error",
    },
}];