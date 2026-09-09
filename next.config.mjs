/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse (app/api/cv-extract/route.ts) wraps pdfjs-dist, which loads
  // its parsing worker from a path relative to its own package files at
  // runtime. Left in Next's default webpack bundle, the route handler gets
  // inlined into .next/server/app/api/cv-extract/route.js and that
  // relative path no longer resolves ("Cannot find module
  // '.../pdf.worker.mjs'"). Marking it external keeps it as a normal
  // node_modules require() instead, so its own path resolution works.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
