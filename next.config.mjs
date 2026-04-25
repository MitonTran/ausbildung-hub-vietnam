/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
};

export default nextConfig;
