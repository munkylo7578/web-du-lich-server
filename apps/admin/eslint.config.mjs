import nextEslintPluginNext from "@next/eslint-plugin-next";
import nx from "@nx/eslint-plugin";
import baseConfig from "../../eslint.base.config.mjs";

export default [
    { plugins: { "@next/next": nextEslintPluginNext } },
    ...nx.configs["flat/react-typescript"],
    ...baseConfig,
    {
        rules: {
            "@nx/enforce-module-boundaries": "off"
        }
    },
    {
        ignores: [
            ".next/**/*"
        ]
    }
];
