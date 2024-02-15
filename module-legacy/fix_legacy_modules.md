# Fixing Legacy Modules

This guide provides step-by-step instructions for fixing the issues with the legacy modules in Companion.

## Introduction
The legacy modules in Companion 2.4 need to be updated to run through the new Companion 3.0 module API. This guide will help you fix the issues and ensure compatibility with the latest version of Companion.

## List of Removed Modules
The following modules had issues when imported into the wrapper:
- analogway-awj
- barco-clickshare
- bitfocus-snapshot
- cisco-webex-websocket
- discord-api
- ecamm-live
- esphome-api
- generic-emberplus
- generic-pjlink
- google-sheets
- ipl-ocp
- linkbox-remote
- magewell-ultrastream
- olzzon-ndicontroller
- panasonic-kairos
- seervision-suite
- sennheiser-evolutionwireless
- sonos-speakers
- soundcraft-ui
- studiocoast-vmix
- theatrixx-xpresscue
- twitch-api
- ventuz-director
- videocom-zoom-bridge
- vystem-api
- youtube-live
- zoom-osc-iso

## Potential Issues
When fixing the legacy modules, there are a few potential issues to be aware of:
- Calls to `system.emit(...)` may now have different timing and will be done asynchronously.
- Calls to `self.parseVariables()` may also have different timing.
- Some uses of the `system` object may have broken in this change. It is recommended to review and update the affected code accordingly.

## Getting Started
To fix the legacy modules, follow these steps:
1. Run `yarn` to install the required modules and dependencies.
2. Start Companion to ensure the necessary environment is set up.

## Migrating a Module
For detailed instructions on migrating a module to not rely on the wrapper, refer to the guide available at [Upgrading a Module Built for Companion 2.x](https://github.com/bitfocus/companion-module-base/wiki/Upgrading-a-module-built-for-Companion-2.x).

## Hacks
To make esm and commonjs play nicely, some hacks have been implemented in the project. These include:
- Putting root files into folders with empty package.json files.
- Using an esm project structure with files ending in .cjs for commonjs compatibility.
