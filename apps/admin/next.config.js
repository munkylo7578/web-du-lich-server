//@ts-check

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

module.exports = nextConfig;
