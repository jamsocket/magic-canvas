**Note: this contains only the client-side code for MagicCanvas demos, provided as a reference. In this form, only the local renderer will run. The server-side is not included in this.**

Structure:
- `dis-lib/` is “Magic Canvas” shared library, which will eventually be extracted as the official Magic Canvas client-side code.
- `lib/` contains helper functions used by pages/renderers.
- `pages/` contains pages that nextjs turns into routes. Currently, pages are 1:1 with renderers, but there’s nothing to stop one renderer from being used by multiple pages.
- `renderers/` contains modules that can be imported as renderers. These should have a filename ending with `.render.js` or `.render.ts`, which tells the loader to process them and not to include them in the main bundle.
- `renderer-loader.js` is the custom loader we use for processing renderers.

Running:

    npm i

    npm run dev
