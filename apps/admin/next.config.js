//@ts-check

const { resolve } = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@database"],
  experimental: {
    proxyClientMaxBodySize: "500mb",
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

/** @param {string} phase */
module.exports = (phase) => {
  // Next.js has already loaded apps/admin/.env* by this point. Force a reload
  // from the repository root instead of reusing that cached environment.
  // Explicit process/PM2 environment variables still take precedence.
  loadEnvConfig(resolve(__dirname, "../.."), phase === PHASE_DEVELOPMENT_SERVER, console, true);
  return nextConfig;
};
