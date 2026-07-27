// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'framerusercontent.com',
      // add any other external hosts you load images from
    ],
  },
  // add redirects, headers, env, etc here as needed
}

export default nextConfig
