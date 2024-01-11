# Wrapper for Companion Legacy Modules

The need for an ES Module (esm) project arises from the requirement for modules in the new format to be compatible with ES Modules. As a result, the project must adhere to the following requirements: 

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

### Project Hacks

There are several hacks used in this project to ensure compatibility and seamless execution. Below are the details:

Note that the modules being proxied may need to be fixed to resolve these issues. and seamless execution. Below are the details: 

Some of the root files have been put into folders with empty package.json files, to make esm and commonjs play nicely.

This project has to be an esm project (as at one point that was a requirement for modules in the new format).  
This means that any CommonJS module must be in a file ending with .cjs, and any import referencing that file must include the ".cjs" extension. It's important to note that modules being proxied may need to be fixed to adhere to these requirements.

The folder hack helps us by letting the resolver see the file as a commonjs package (letting it be .js again), and because of the naming it lines up.
