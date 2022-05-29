# Companion Legacy Modules

This is a wrapper to wrap a Companion 2.2 module to run through the new Companion 2.3/3.0 module api.

### Potential issues

Any calls made to `system.emit(....)` in modules may now have different timing. They may have returned immediately before, but will now almost always result in the call being done asynchronously.

The same is true of calls to `self.parseVariables()`.

It is possible that some uses of system may have broken in this change. It is very hard for us to discover the events that modules are emitting or listening for so it is very possible that some were missed. We can add them to this wrapper to minimise module breakage, but they likely wont be supported in the new api unless they are separately requested.

### Getting started

- Run `yarn` to install the modules and dependencies
- Start companion

### Migrating a module to not rely on this wrapper

TODO

The whole module api has been rethought. Many methods had very bad/vague names, and signatures were weird or inconsistent.  
The changes are as follows:

- TODO

The `system.emit('rest_get', ...)` and related calls are not supported, instead you should bundle a http client library yourself. We recommend using got, but any client which is maintained is fine.

The tcp/udp/telnet connection helpers have been redesigned from the ground up (TODO this)

### Hacks

Some of the root files have been put into folders with empty package.json files, to make esm and commonjs play nicely.

This project has to be an esm project (as that is a requirement for modules in the new format).  
Which means that anything commonjs must be in a file ending with .cjs, but then anything importing that file has to include the extension in the import. This means that the modules we are trying to proxy will need to be fixed to resolve that.

The folder hack helps us by letting the resolver see the file as a commonjs package (letting it be .js again), and because of the naming it lines up.