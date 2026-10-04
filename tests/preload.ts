// Keeps the unit suite hermetic with respect to the ambient environment.
//
// CI exports `XDG_CONFIG_HOME` (as do many developer shells). Tests compute the
// global config location relative to a freshly created temp `home`, so an
// ambient `XDG_CONFIG_HOME` would redirect `globalConfigPath` to a shared,
// machine-wide directory and make the suite order-dependent. Clearing it here
// makes `bun test` behave the same with or without it. Tests that intentionally
// exercise `XDG_CONFIG_HOME` set it explicitly and restore it.
delete process.env.XDG_CONFIG_HOME
