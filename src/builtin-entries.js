import Entry from "./entry.js"
import Module from "./module.js"
import OwnProxy from "./own/proxy.js"

import assign from "./util/assign.js"
import builtinModules from "./module/builtin-modules.js"
import copyProperty from "./util/copy-property.js"
import has from "./util/has.js"
import isNamespaceObject from "./util/is-namespace-object.js"
import isOwnProxy from "./util/is-own-proxy.js"
import keysAll from "./util/keys-all.js"
import proxyExports from "./util/proxy-exports.js"
import realRequire from "./real/require.js"
import setDeferred from "./util/set-deferred.js"
import shared from "./shared.js"
import toNamespaceObject from "./util/to-namespace-object.js"
import unwrapProxy from "./util/unwrap-proxy.js"

const ExObject = __external__.Object

const builtinEntries = { __proto__: null }

function createUtilExports(source) {
  const exported = new ExObject
  const names = keysAll(source)

  for (const name of names) {
    if (name !== "inspect" &&
        name !== "types") {
      copyProperty(exported, source, name)
    }
  }

  exported.inspect = new OwnProxy(source.inspect, {
    apply(target, thisArg, args) {
      const [value] = args

      if (isOwnProxy(value)) {
        args[0] = isNamespaceObject(value)
          ? toNamespaceObject(value)
          : unwrapProxy(value)
      }

      return Reflect.apply(target, thisArg, args)
    }
  })

  const sourceTypes = source.types

  if (sourceTypes) {
    exported.types = assign(new ExObject, sourceTypes)
    exported.types.isProxy = new OwnProxy(sourceTypes.isProxy, {
      apply(target, thisArg, args) {
        return ! isOwnProxy(args[0]) &&
          Reflect.apply(target, thisArg, args)
      }
    })
  }

  const { customInspectKey } = shared

  // Defining a truthy, but non-function value, for `customInspectKey` will
  // inform builtin `inspect()` to bypass the deprecation warning for the
  // custom `util.inspect()` function when inspecting `util`.
  if (! has(exported, customInspectKey)) {
    Reflect.defineProperty(exported, customInspectKey, {
      __proto__: null,
      configurable: true,
      value: true,
      writable: true
    })
  }

  return exported
}

function createVMExports(source) {
  const exported = new ExObject
  const names = keysAll(source)

  for (const name of names) {
    if (name !== "Module") {
      copyProperty(exported, source, name)
    }
  }

  return exported
}

for (const id of builtinModules) {
  setDeferred(builtinEntries, id, () => {
    let exported = unwrapProxy(realRequire(id))

    if (id === "module") {
      exported = Module
    } else if (id === "util") {
      exported = createUtilExports(exported)
    } else if (id === "vm" &&
        has(exported, "Module")) {
      exported = createVMExports(exported)
    }

    const mod = new Module(id, null)
    const entry = Entry.get(mod)
    const oldExported = exported

    mod.exports = oldExported
    mod.loaded = true

    exported =
    mod.exports = proxyExports(entry)

    if (typeof oldExported === "function") {
      const oldProto = oldExported.prototype

      if (has(oldProto, "constructor") &&
          oldProto.constructor === oldExported) {
        oldExported.prototype.constructor = exported
      }
    }

    Entry.set(exported, entry)

    entry.builtin = true
    entry.id = id
    entry.loaded()
    return entry
  })
}

export default builtinEntries
