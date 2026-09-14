//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@database"],
  experimental: {
    proxyClientMaxBodySize: "55mb",
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
};

module.exports = nextConfig;
