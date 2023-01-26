const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (
    config
  ) => {
    config.module.rules.push({
      test: /\.render.[tj]s$/,
      use: [
        {
          loader: path.resolve(__dirname, 'renderer-loader.js'),
        },
      ],
    })

    return config
  },
}

module.exports = nextConfig
