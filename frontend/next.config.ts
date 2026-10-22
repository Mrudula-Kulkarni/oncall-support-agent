import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build to plain HTML/JS in out/, so Render can serve it as a free static site. Every page
  // already does its work in the browser, so nothing needs a Node server.
  output: "export",
  // /incidents -> incidents/index.html, which any static host serves without rewrite rules.
  trailingSlash: true,
};

export default nextConfig;
