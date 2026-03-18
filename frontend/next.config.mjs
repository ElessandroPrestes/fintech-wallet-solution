/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Frontend é acessado na porta 3001 no host
      allowedOrigins: ['localhost:3001'],
    },
  },
};

export default nextConfig;
