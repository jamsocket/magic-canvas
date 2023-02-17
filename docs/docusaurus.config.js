// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MagicCanvas',
  tagline: 'Render your WebGL in the cloud.',
  url: 'https://canvas.stream',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.png',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'drifting-in-space', // Usually your GitHub org/user name.
  projectName: 'magic-canvas', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      {
        docs: {
          sidebarPath: false // require.resolve('./docs/sidebars.js'),
        },
        blog: false
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'MagicCanvas',
        logo: {
          alt: 'Drifting in Space Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'three-example',
            position: 'left',
            label: 'An Example',
          },
          {
            type: 'doc',
            docId: 'api',
            position: 'left',
            label: 'API',
          },
          {
            href: 'https://github.com/drifting-in-space/magic-canvas',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/N5sEpsuhh9',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/drifting_corp',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Drifting in Space',
                href: 'https://driftingin.space',
              },
              {
                label: 'Jamsocket',
                href: 'https://jamsocket.com',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/drifting-in-space/magic-canvas',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Drifting in Space.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      scripts: [{src: 'https://plausible.io/js/script.js', defer: true, 'data-domain': 'canvas.stream'}],
    }),
};

module.exports = config;
