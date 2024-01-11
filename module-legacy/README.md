# Companion Legacy Modules

This is a wrapper to wrap a Companion 2.4 module to run through the new Companion 3.0 module api.

### Removed modules

The following modules had issues when imported into this wrapper

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

### Potential issues

Any calls made to `system.emit(....)` in modules may now have different timing. They may have returned immediately before, but will now almost always result in the call being done asynchronously.

The same is true of calls to `self.parseVariables()`.

The updated timing of calls and the use of asynchronous methods can help to fix these issues. Additionally, we can add the missed events to the wrapper to minimize module breakage, but they may not be supported in the new API unless they are separately requested.

### Getting started

- Run `yarn` to install the modules and dependencies
- Start companion. Ensure that calls to system.emit() and self.parseVariables() are handled asynchronously.

### Migrating a module to not rely on this wrapper

For a guide on migrating a module to not rely on this wrapper, refer to https://github.com/bitfocus/companion-module-base/wiki/Upgrading-a-module-built-for-Companion-3.0

There is a guide available at https://github.com/bitfocus/companion-module-base/wiki/Upgrading-a-module-built-for-Companion-2.x

### Hacks

Some of the root files have been put into folders with empty package.json files, to make esm and commonjs play nicely.

This project has to be an esm project (as at one point that was a requirement for modules in the new format).  
Which means that anything commonjs must be in a file ending with .cjs, but then anything importing that file has to include the extension in the import. This means that the modules we are trying to proxy will need to be fixed to resolve that.

The folder hack helps us by letting the resolver see the file as a commonjs package (letting it be .js again), and because of the naming it lines up.
