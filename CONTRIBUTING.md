# Contributing

Thanks for helping. Cadence is small and runs inside other people's sites, so changes are reviewed closely.

## Reporting a problem

Open an issue with the report link (Copy link on any report) and the device and browser you ran it on. A link to the page you tested helps too.

## Before you write code

- Bugs and typos: send a pull request.
- New features: open an issue first, so we can agree on the approach before you build it.

## Sending a pull request

1. Fork the repo and create a named branch in your fork, such as `fix-safari-fps`. Pull requests from `main`, `master` or GitHub's `patch-1` style branches are closed automatically.
2. Keep it to one change. Small pull requests get reviewed faster.
3. Run `npm run typecheck` and `npm run build` before you push.
4. For anything visible, add a screenshot on desktop and on a phone.

New accounts and very large changes may be blocked automatically.

## The npm package

The package (`packages/cadence-probe`) and its releases are handled by the maintainer only. Pull requests that change it, or its version, are closed.

## Rules for the probe

The probe (`src/probe` and `src/shared`) runs on other people's sites. Changes there need to:

- Send nothing anywhere. No `fetch`, beacons, sockets or new URLs.
- Add no dependencies.
- Stay small. Check the gzipped size of `public/probe.js` before and after.

Built files (`public/probe.js`, `dist/`) come from the build. Don't commit them.

## Setup

See [Develop](README.md#develop) in the README.
