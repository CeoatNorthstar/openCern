/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  serverExternalPackages: ["monaco-editor", "@monaco-editor/react", "@monaco-editor/loader"],
};

export default nextConfig;
