import getModuleURL from "./util/get-module-url.js"
import { inspect } from "./safe/util.js"
import shared from "./shared.js"
import toStringLiteral from "./util/to-string-literal.js"

function init() {
  const ExError = __external__.Error
  const ExSyntaxError = __external__.SyntaxError
  const ExTypeError = __external__.TypeError

  const errors = { __proto__: null }
  const messages = { __proto__: null }

  addError("ERR_EXPORT_MISSING", exportMissing, ExSyntaxError)
  addError("ERR_EXPORT_STAR_CONFLICT", exportStarConflict, ExSyntaxError)
  addError("ERR_INVALID_ESM_FILE_EXTENSION", invalidExtension, ExError)
  addError("ERR_INVALID_ESM_MODE", invalidPkgMode, ExError)
  addError("ERR_UNKNOWN_ESM_OPTION", unknownPkgOption, ExError)

  addNodeError("ERR_INVALID_ARG_TYPE", invalidArgType, ExTypeError)
  addNodeError("ERR_INVALID_ARG_VALUE", invalidArgValue, ExError)
  addNodeError("ERR_INVALID_PROTOCOL", invalidProtocol, ExError)
  addNodeError("ERR_MODULE_RESOLUTION_LEGACY", moduleResolutionLegacy, ExError)
  addNodeError("ERR_REQUIRE_ESM", requireESM, ExError)
  addNodeError("ERR_UNKNOWN_FILE_EXTENSION", unknownFileExtension, ExError)
  addNodeError("MODULE_NOT_FOUND", missingCJS, ExError)

  function addError(code, messageHandler, Super) {
    errors[code] = createErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function addNodeError(code, messageHandler, Super) {
    errors[code] = createNodeErrorClass(Super, code)
    messages[code] = messageHandler
  }

  function createErrorClass(Super, code) {
    return function BuiltinError(...args) {
      return new Super(messages[code](...args))
    }
  }

  function createNodeErrorClass(Super, code) {
    return class NodeError extends Super {
      constructor(...args) {
        super(messages[code](...args))

        if (code === "MODULE_NOT_FOUND") {
          this.code = code
          this.name = super.name
        }
      }

      get code() {
        return code
      }

      set code(value) {
        Reflect.defineProperty(this, "code", {
          __proto__: null,
          configurable: true,
          enumerable: true,
          value,
          writable: true
        })
      }

      get name() {
        return super.name + " [" + code + "]"
      }

      set name(value) {
        Reflect.defineProperty(this, "name", {
          __proto__: null,
          configurable: true,
          enumerable: true,
          value,
          writable: true
        })
      }
    }
  }

  function truncInspect(value) {
    const inspected = inspect(value)

    return inspected.length > 128
      ? inspected.slice(0, 128) + "..."
      : inspected
  }

  function exportMissing(request, exportName) {
    const moduleName = getModuleURL(request)

    return "ES Module " + toStringLiteral(moduleName, "'") +
      " does not provide an export named '" + exportName + "'"
  }

  function exportStarConflict(request, exportName) {
    const moduleName = getModuleURL(request)

    return "ES Module " + toStringLiteral(moduleName, "'") +
      " contains conflicting star exports for name '" + exportName + "'"
  }

  function invalidArgType(argName, expected, actual) {
    let message = "The '" + argName + "' argument must be " + expected

    if (arguments.length > 2) {
      message += ". Received type " + (actual === null ? "null" : typeof actual)
    }

    return message
  }

  function invalidArgValue(argName, value, reason = "is invalid") {
    return "The argument '" + argName + "' " + reason +
      ". Received " + truncInspect(value)
  }

  function invalidExtension(request) {
    const moduleName = getModuleURL(request)

    return "ES Module " + toStringLiteral(moduleName, "'") +
      " cannot be loaded from .mjs files"
  }

  function invalidPkgMode(mode) {
    return "The ESM option 'mode' is invalid. Received " + truncInspect(mode)
  }

  function invalidProtocol(protocol, expected) {
    return "Protocol '" + protocol +
      "' not supported. Expected '" + expected + "'"
  }

  function missingCJS(request) {
    return "Cannot find module " + toStringLiteral(request, "'")
  }

  function moduleResolutionLegacy(id, fromPath, foundPath) {
    return id + " not found by import in " + fromPath +
      ". Legacy behavior in require() would have found it at " + foundPath
  }

  function requireESM(request) {
    return "Must use import to load ES Module: " + getModuleURL(request)
  }

  function unknownFileExtension(filename) {
    return "Unknown file extension: " + filename
  }

  function unknownPkgOption(optionName) {
    return "Unknown ESM option: " + optionName
  }

  return errors
}

export default shared.inited
  ? shared.module.errors
  : shared.module.errors = init()
