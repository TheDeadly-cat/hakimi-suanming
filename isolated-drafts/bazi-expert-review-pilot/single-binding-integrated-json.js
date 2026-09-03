export const SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES = 2 * 1024 * 1024;

export class SingleBindingIntegratedJsonError extends Error {
  constructor(message) {
    super(message);
    this.name = "SingleBindingIntegratedJsonError";
  }
}

function scanStrictJson(rawText, label) {
  let index = 0;
  let depth = 0;
  const fail = (message) => {
    throw new SingleBindingIntegratedJsonError(`${label} 不是严格 JSON：${message}`);
  };
  const whitespace = /[\u0009\u000a\u000d\u0020]/u;
  const skipWhitespace = () => {
    while (index < rawText.length && whitespace.test(rawText[index])) index += 1;
  };
  const parseStringToken = () => {
    if (rawText[index] !== '"') fail("字符串起始符无效。 ");
    const start = index;
    index += 1;
    while (index < rawText.length) {
      const code = rawText.charCodeAt(index);
      if (rawText[index] === '"') {
        index += 1;
        try {
          return JSON.parse(rawText.slice(start, index));
        } catch {
          fail("字符串转义无效。 ");
        }
      }
      if (code < 0x20) fail("字符串含未转义控制字符。 ");
      if (rawText[index] === "\\") {
        index += 1;
        if (index >= rawText.length || !'"\\/bfnrtu'.includes(rawText[index])) fail("字符串转义无效。 ");
        if (rawText[index] === "u") {
          const hex = rawText.slice(index + 1, index + 5);
          if (!/^[a-fA-F0-9]{4}$/u.test(hex)) fail("Unicode 转义无效。 ");
          index += 4;
        }
      }
      index += 1;
    }
    fail("字符串未闭合。 ");
  };
  const parseValue = () => {
    skipWhitespace();
    if (depth > 128) fail("嵌套层级超过 128。 ");
    const token = rawText[index];
    if (token === '"') {
      parseStringToken();
      return;
    }
    if (token === "{") {
      depth += 1;
      index += 1;
      skipWhitespace();
      const keys = new Set();
      if (rawText[index] === "}") {
        index += 1;
        depth -= 1;
        return;
      }
      while (index < rawText.length) {
        skipWhitespace();
        const key = parseStringToken();
        if (keys.has(key)) fail(`对象含重复键 ${JSON.stringify(key)}。`);
        keys.add(key);
        skipWhitespace();
        if (rawText[index] !== ":") fail("对象键后缺少冒号。 ");
        index += 1;
        parseValue();
        skipWhitespace();
        if (rawText[index] === "}") {
          index += 1;
          depth -= 1;
          return;
        }
        if (rawText[index] !== ",") fail("对象成员分隔符无效。 ");
        index += 1;
      }
      fail("对象未闭合。 ");
    }
    if (token === "[") {
      depth += 1;
      index += 1;
      skipWhitespace();
      if (rawText[index] === "]") {
        index += 1;
        depth -= 1;
        return;
      }
      while (index < rawText.length) {
        parseValue();
        skipWhitespace();
        if (rawText[index] === "]") {
          index += 1;
          depth -= 1;
          return;
        }
        if (rawText[index] !== ",") fail("数组成员分隔符无效。 ");
        index += 1;
      }
      fail("数组未闭合。 ");
    }
    for (const literal of ["true", "false", "null"]) {
      if (rawText.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rawText.slice(index));
    if (!number) fail("值无效。 ");
    index += number[0].length;
  };
  skipWhitespace();
  parseValue();
  skipWhitespace();
  if (index !== rawText.length) fail("末尾含额外内容。 ");
}

export function parseSingleBindingIntegratedStrictJsonText(rawText, {
  label = "输入",
  maxBytes = SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES
} = {}) {
  if (typeof rawText !== "string") throw new SingleBindingIntegratedJsonError(`${label} 必须是 UTF-8 文本。`);
  const byteLength = new TextEncoder().encode(rawText).byteLength;
  if (byteLength <= 0 || byteLength > maxBytes) {
    throw new SingleBindingIntegratedJsonError(`${label} 必须非空且不超过 ${maxBytes} 字节。`);
  }
  if (rawText.charCodeAt(0) === 0xfeff) throw new SingleBindingIntegratedJsonError(`${label} 不得包含 BOM。`);
  scanStrictJson(rawText, label);
  try {
    return JSON.parse(rawText);
  } catch {
    throw new SingleBindingIntegratedJsonError(`${label} 不是有效 JSON。`);
  }
}

export function parseSingleBindingIntegratedStrictJsonBytes(bytes, options = {}) {
  if (!(bytes instanceof Uint8Array)) throw new SingleBindingIntegratedJsonError("输入必须是 Uint8Array。 ");
  const maxBytes = options.maxBytes ?? SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES;
  if (bytes.byteLength <= 0 || bytes.byteLength > maxBytes) {
    throw new SingleBindingIntegratedJsonError(`输入必须非空且不超过 ${maxBytes} 字节。`);
  }
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new SingleBindingIntegratedJsonError(`${options.label ?? "输入"} 不得包含 UTF-8 BOM。`);
  }
  let rawText;
  try {
    rawText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SingleBindingIntegratedJsonError(`${options.label ?? "输入"} 不是严格 UTF-8。`);
  }
  return parseSingleBindingIntegratedStrictJsonText(rawText, { ...options, maxBytes });
}

function assertJsonTree(value, path = "root", state = { nodes: 0, active: new WeakSet() }, depth = 0) {
  state.nodes += 1;
  if (state.nodes > 20_000 || depth > 128) throw new SingleBindingIntegratedJsonError(`${path} 超过 JSON 结构上限。`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new SingleBindingIntegratedJsonError(`${path} 含非有限数值。`);
    return;
  }
  if (typeof value !== "object" || state.active.has(value)) {
    throw new SingleBindingIntegratedJsonError(`${path} 含循环或非 JSON 值。`);
  }
  state.active.add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) throw new SingleBindingIntegratedJsonError(`${path} 数组原型无效。`);
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) throw new SingleBindingIntegratedJsonError(`${path} 含稀疏数组。`);
      assertJsonTree(value[index], `${path}[${index}]`, state, depth + 1);
    }
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype) throw new SingleBindingIntegratedJsonError(`${path} 必须是普通对象。`);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (["__proto__", "prototype", "constructor"].includes(key)
        || !descriptor.enumerable || descriptor.get || descriptor.set) {
        throw new SingleBindingIntegratedJsonError(`${path} 含禁止键或访问器。`);
      }
      assertJsonTree(descriptor.value, `${path}.${key}`, state, depth + 1);
    }
  }
  state.active.delete(value);
}

export function canonicalStringifySingleBindingIntegrated(value) {
  assertJsonTree(value);
  const visit = (entry) => {
    if (entry === null || typeof entry !== "object") return JSON.stringify(entry);
    if (Array.isArray(entry)) return `[${entry.map(visit).join(",")}]`;
    return `{${Object.keys(entry).sort().map((key) => `${JSON.stringify(key)}:${visit(entry[key])}`).join(",")}}`;
  };
  return visit(value);
}

export function serializeSingleBindingIntegratedUtf8Json(value) {
  assertJsonTree(value);
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function sha256SingleBindingIntegratedBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || !globalThis.crypto?.subtle) {
    throw new SingleBindingIntegratedJsonError("当前环境不能计算输入字节的 SHA-256。 ");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function sha256SingleBindingIntegratedText(text) {
  if (typeof text !== "string") throw new SingleBindingIntegratedJsonError("SHA-256 文本输入无效。 ");
  return sha256SingleBindingIntegratedBytes(new TextEncoder().encode(text));
}
