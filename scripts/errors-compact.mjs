// Re-encode teleproto's errors/RPCErrorList.js (~700 near-identical generated classes,
// ~400 KB) as a table plus one generator. Classes with a captured value (FLOOD_WAIT_N,
// …) are kept verbatim. test/bundle-shrink.test.ts checks every class behaves the same.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function originalErrorsPath() {
  return require.resolve('teleproto/errors/RPCErrorList.js');
}

const SIMPLE = new RegExp(
  String.raw`(?:/\*\*[^*]*(?:\*(?!/)[^*]*)*\*/\n)?` + // optional JSDoc
    String.raw`class (\w+) extends RPCBaseErrors_1\.(\w+) \{\n` +
    String.raw`    constructor\(args\) \{\n` +
    String.raw`        const message = ("(?:[^"\\]|\\.)*") \+ RPCBaseErrors_1\.RPCError\._fmtRequest\(args\.request\);\n` +
    String.raw`        super\(message, args\.request\);\n` +
    String.raw`        this\.message = message;\n` +
    String.raw`        this\.errorMessage = ("[A-Z0-9_]+");\n` +
    String.raw`    \}\n\}\nexports\.\1 = \1;\n`,
  'g'
);

export function compactErrorsSource(src = readFileSync(originalErrorsPath(), 'utf8')) {
  const table = [];
  let first = -1;
  let out = src.replace(SIMPLE, (_m, name, base, message, code, offset) => {
    if (first < 0) first = offset;
    table.push([name, base, JSON.parse(message), JSON.parse(code)]);
    return first === offset ? '/*__GENERATED__*/\n' : '';
  });
  if (table.length < 600) throw new Error(`Only ${table.length} simple error classes matched; teleproto layout changed`);

  const generator = `const __ERRS = ${JSON.stringify(table)};
for (const [n, b, d, c] of __ERRS) {
  exports[n] = { [n]: class extends RPCBaseErrors_1[b] {
    constructor(args) {
      const message = d + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = c;
    }
  } }[n];
}
`;
  out = out.replace('/*__GENERATED__*/\n', generator);

  // Remaining code (verbatim classes, lookup maps) referred to the removed classes by bare name
  const names = new Set(table.map(t => t[0]));
  const head = out.indexOf(generator) + generator.length;
  const tail = out.slice(head).replace(/\b[A-Z]\w*Error\b/g, id => (names.has(id) ? `exports.${id}` : id));
  return out.slice(0, head) + tail;
}
