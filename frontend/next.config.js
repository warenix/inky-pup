/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for GitHub Pages (custom domain inkypup.ivy.hk serves
  // from the domain root, so no basePath).
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    // Keep tesseract.js out of the server bundle: it is only ever
    // dynamically imported in the browser (lib/ocr.ts -> getWorker).
    // Bundling it for the server corrupts dev chunk paths (./819.js).
    serverComponentsExternalPackages: ["tesseract.js"],
  },
};
module.exports = nextConfig;
