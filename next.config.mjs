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
  // serverExternalPackages fixes local `next start`, where the full
  // node_modules tree is on disk regardless of bundling. Vercel's
  // serverless functions instead ship only the files its own build-time
  // tracer (@vercel/nft) statically discovers — and pdf-parse resolves its
  // worker file dynamically at runtime, so the tracer misses it and the
  // deployed function 500s with the same "Cannot find module
  // '.../pdf.worker.mjs'" error, just in production instead of locally.
  // Explicitly including the worker files here fixes that. Confirmed via a
  // real isolated run of the traced output (not guessed): the actual path
  // pdf-parse's bundled pdfjs-dist resolves at runtime is
  // pdfjs-dist/legacy/build/pdf.worker.mjs, a sibling of the pdf.mjs it
  // requires — not a file under pdf-parse's own dist folder.
  outputFileTracingIncludes: {
    "/api/cv-extract": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
