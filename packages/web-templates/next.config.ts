import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  // Add external packages here if needed (e.g. better-sqlite3, puppeteer)
  // serverExternalPackages: ["better-sqlite3"],
}

export default nextConfig
