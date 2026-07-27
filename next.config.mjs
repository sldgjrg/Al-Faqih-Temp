// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // ESLint still runs through `npm run lint`; this avoids Next serializing
    // FlatCompat's parser functions during production builds.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'framerusercontent.com',
      // add any other external hosts you load images from
    ],
  },
  // add redirects, headers, env, etc here as needed
}

export default nextConfig
