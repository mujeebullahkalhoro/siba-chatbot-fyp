/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy schema download requests to the backend
        source: "/api/schemas/download/:path*",
        destination: "http://localhost:8000/api/schemas/download/:path*",
      },
    ];
  },
};

export default nextConfig;
