//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@database"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
