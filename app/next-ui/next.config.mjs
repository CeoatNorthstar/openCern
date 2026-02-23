/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@monaco-editor/react", "@monaco-editor/loader"],
  serverExternalPackages: ["monaco-editor"],
};

export default nextConfig;
