# companion-module-ecclesialab-worshiplive

Bitfocus Companion module for [Worship LIVE](https://ecclesialab.co.kr/), the worship subtitle and presentation app for Mac.

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)

## Getting started

Executing a `yarn` command should perform all necessary steps to develop the module, if it does not then follow the steps below.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.

## How it talks to Worship LIVE

Worship LIVE answers `GET /api/deck/<command>` on a local socket of the Mac it runs on (no password), and on port 7788 of the network when "Use from another computer" is turned on in the app (with its password). The module reads `status` once a second for feedbacks and variables. `src/icons.ts` is generated from the app's own key pictures.
