/**
 * A small JSON Schema 2020-12 validator: the manifest schema (schemas/tg-plugin/*.json) is checked
 * with it, and P2 checks a command's input and output with it. No dependency: the bundle has none.
 *
 * Only the keywords in SUPPORTED are implemented. A schema that uses any other keyword is refused
 * when it is compiled (`UnsupportedSchemaError`), never silently treated as "anything goes".
 * `$ref` resolves only inside the same schema (`#`, `#/$defs/…`, JSON Pointer); schemas are
 * self-contained by the plugin spec.
 */

export interface SchemaIssue {
  /** JSON Pointer of the value that failed, `""` for the root */
  path: string;
  message: string;
}

export class UnsupportedSchemaError extends Error {}

const SUPPORTED = new Set([
  '$schema', '$id', '$defs', '$ref', '$comment', 'title', 'description', 'default', 'examples', 'deprecated', 'readOnly', 'writeOnly',
  'type', 'enum', 'const',
  'properties', 'required', 'additionalProperties', 'patternProperties', 'propertyNames', 'minProperties', 'maxProperties',
  'items', 'prefixItems', 'minItems', 'maxItems', 'uniqueItems', 'contains',
  'pattern', 'minLength', 'maxLength', 'format',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else',
]);

/** Keywords whose value is a schema, a list of schemas or a map of schemas (walked by `schemaKeywords`). */
const ONE_SCHEMA = ['additionalProperties', 'propertyNames', 'items', 'contains', 'not', 'if', 'then', 'else'];
const SCHEMA_LIST = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const SCHEMA_MAP = ['properties', 'patternProperties', '$defs'];

type Schema = boolean | Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Every subschema of a schema with the pointer to it, the root first. */
export function* subschemas(schema: unknown, pointer = ''): Generator<{ pointer: string; schema: Record<string, unknown> }> {
  if (!isObject(schema)) return;
  yield { pointer, schema };
  for (const k of ONE_SCHEMA) if (k in schema) yield* subschemas(schema[k], `${pointer}/${k}`);
  for (const k of SCHEMA_LIST) {
    const list = schema[k];
    if (Array.isArray(list)) for (let i = 0; i < list.length; i++) yield* subschemas(list[i], `${pointer}/${k}/${i}`);
  }
  for (const k of SCHEMA_MAP) {
    const map = schema[k];
    if (isObject(map)) for (const [name, sub] of Object.entries(map)) yield* subschemas(sub, `${pointer}/${k}/${escapePointer(name)}`);
  }
}

const escapePointer = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1');
const unescapePointer = (s: string) => s.replace(/~1/g, '/').replace(/~0/g, '~');

/** Throws UnsupportedSchemaError for a keyword this validator does not implement or a non-local $ref. */
export function assertSupported(schema: unknown): void {
  if (typeof schema === 'boolean') return;
  if (!isObject(schema)) throw new UnsupportedSchemaError('A schema must be an object or a boolean');
  for (const { pointer, schema: s } of subschemas(schema)) {
    for (const key of Object.keys(s)) {
      if (!SUPPORTED.has(key)) throw new UnsupportedSchemaError(`Unsupported JSON Schema keyword "${key}" at ${pointer || '/'}`);
    }
    if ('$ref' in s && (typeof s.$ref !== 'string' || !s.$ref.startsWith('#'))) {
      throw new UnsupportedSchemaError(`Only local $ref ("#/…") is supported, at ${pointer || '/'}`);
    }
    if ('pattern' in s) compilePattern(s.pattern, pointer);
  }
}

const patterns = new Map<string, RegExp>();
function compilePattern(p: unknown, pointer = ''): RegExp {
  if (typeof p !== 'string') throw new UnsupportedSchemaError(`"pattern" must be a string, at ${pointer || '/'}`);
  let re = patterns.get(p);
  if (!re) {
    try {
      re = new RegExp(p, 'u');
    } catch {
      throw new UnsupportedSchemaError(`Invalid "pattern" ${JSON.stringify(p)} at ${pointer || '/'}`);
    }
    patterns.set(p, re);
  }
  return re;
}

function resolveRef(root: Schema, ref: string): Schema {
  if (ref === '#') return root;
  if (!ref.startsWith('#/')) throw new UnsupportedSchemaError(`Unsupported $ref ${ref}`);
  let cur: unknown = root;
  for (const part of ref.slice(2).split('/').map(p => unescapePointer(decodeURIComponent(p)))) {
    if (!isObject(cur) || !(part in cur)) throw new UnsupportedSchemaError(`$ref ${ref} points nowhere`);
    cur = cur[part];
  }
  if (typeof cur !== 'boolean' && !isObject(cur)) throw new UnsupportedSchemaError(`$ref ${ref} is not a schema`);
  return cur as Schema;
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function typeMatches(value: unknown, type: string): boolean {
  const t = typeOf(value);
  return t === type || (type === 'number' && t === 'integer');
}

/** Deep equality of JSON values (object key order does not matter). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((x, i) => jsonEqual(x, bb[i]));
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  return ka.length === kb.length && ka.every(k => Object.hasOwn(b as object, k) && jsonEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Characters as JSON Schema counts them: code points, not UTF-16 units. */
const length = (s: string) => [...s].length;

const describe = (v: unknown) => JSON.stringify(v)?.slice(0, 60) ?? String(v);

/**
 * Validates `value` against `schema`. Returns the issues found (empty when valid), at most `limit`.
 * Call `assertSupported(schema)` first for a schema that did not come from this repository.
 */
export function validate(schema: Schema, value: unknown, limit = 20): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  check(schema, schema, value, '', issues, limit);
  return issues.slice(0, limit);
}

function check(root: Schema, schema: Schema, value: unknown, path: string, out: SchemaIssue[], limit: number): void {
  if (out.length >= limit) return;
  if (schema === true) return;
  if (schema === false) { out.push({ path, message: 'is not allowed' }); return; }
  const s = schema;
  const add = (message: string, at = path) => { out.push({ path: at, message }); };
  const sub = (sch: unknown, v: unknown, p: string) => check(root, sch as Schema, v, p, out, limit);
  const passes = (sch: unknown, v: unknown) => { const tmp: SchemaIssue[] = []; check(root, sch as Schema, v, path, tmp, 1); return tmp.length === 0; };

  if (typeof s.$ref === 'string') sub(resolveRef(root, s.$ref), value, path);

  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type as string[] : [s.type as string];
    if (!types.some(t => typeMatches(value, t))) { add(`must be ${types.join(' or ')}, got ${typeOf(value)}`); return; }
  }
  if (Array.isArray(s.enum) && !s.enum.some(e => jsonEqual(e, value))) add(`must be one of ${s.enum.map(describe).join(', ')}`);
  if ('const' in s && !jsonEqual(s.const, value)) add(`must be ${describe(s.const)}`);

  if (typeof value === 'string') {
    if (typeof s.minLength === 'number' && length(value) < s.minLength) add(s.minLength === 1 ? 'must not be empty' : `must have at least ${s.minLength} characters`);
    if (typeof s.maxLength === 'number' && length(value) > s.maxLength) add(`must have at most ${s.maxLength} characters`);
    if (s.pattern !== undefined && !compilePattern(s.pattern).test(value)) add(`does not match the pattern ${s.pattern as string}`);
  }
  if (typeof value === 'number') {
    if (typeof s.minimum === 'number' && value < s.minimum) add(`must be >= ${s.minimum}`);
    if (typeof s.maximum === 'number' && value > s.maximum) add(`must be <= ${s.maximum}`);
    if (typeof s.exclusiveMinimum === 'number' && value <= s.exclusiveMinimum) add(`must be > ${s.exclusiveMinimum}`);
    if (typeof s.exclusiveMaximum === 'number' && value >= s.exclusiveMaximum) add(`must be < ${s.exclusiveMaximum}`);
    if (typeof s.multipleOf === 'number' && s.multipleOf > 0 && !Number.isInteger(value / s.multipleOf)) add(`must be a multiple of ${s.multipleOf}`);
  }
  if (Array.isArray(value)) {
    if (typeof s.minItems === 'number' && value.length < s.minItems) add(`must have at least ${s.minItems} items`);
    if (typeof s.maxItems === 'number' && value.length > s.maxItems) add(`must have at most ${s.maxItems} items`);
    if (s.uniqueItems === true) {
      for (let i = 0; i < value.length; i++) {
        if (value.slice(0, i).some(x => jsonEqual(x, value[i]))) { add(`has a duplicate item ${describe(value[i])}`, `${path}/${i}`); break; }
      }
    }
    const prefix = Array.isArray(s.prefixItems) ? s.prefixItems : [];
    prefix.forEach((sch, i) => { if (i < value.length) sub(sch, value[i], `${path}/${i}`); });
    if (s.items !== undefined) for (let i = prefix.length; i < value.length; i++) sub(s.items, value[i], `${path}/${i}`);
    if (s.contains !== undefined && !value.some(v => passes(s.contains, v))) add('contains no matching item');
  }
  if (isObject(value)) {
    const keys = Object.keys(value);
    if (typeof s.minProperties === 'number' && keys.length < s.minProperties) add(`must have at least ${s.minProperties} properties`);
    if (typeof s.maxProperties === 'number' && keys.length > s.maxProperties) add(`must have at most ${s.maxProperties} properties`);
    if (Array.isArray(s.required)) for (const r of s.required as string[]) if (!Object.hasOwn(value, r)) add(`must have "${r}"`);
    const props = isObject(s.properties) ? s.properties : {};
    const patternProps = isObject(s.patternProperties) ? Object.entries(s.patternProperties).map(([p, sch]) => [compilePattern(p), sch] as const) : [];
    for (const k of keys) {
      const at = `${path}/${escapePointer(k)}`;
      if (s.propertyNames !== undefined) {
        const tmp: SchemaIssue[] = [];
        check(root, s.propertyNames as Schema, k, at, tmp, 1);
        if (tmp.length) add(`name ${describe(k)} ${tmp[0].message}`, at);
      }
      let known = false;
      if (Object.hasOwn(props, k)) { known = true; sub(props[k], value[k], at); }
      for (const [re, sch] of patternProps) if (re.test(k)) { known = true; sub(sch, value[k], at); }
      if (!known && s.additionalProperties !== undefined) {
        if (s.additionalProperties === false) add(`has an unknown property "${k}"`, at);
        else sub(s.additionalProperties, value[k], at);
      }
    }
  }
  if (Array.isArray(s.allOf)) for (const sch of s.allOf) sub(sch, value, path);
  if (Array.isArray(s.anyOf) && !s.anyOf.some(sch => passes(sch, value))) add('matches none of the allowed shapes (anyOf)');
  if (Array.isArray(s.oneOf)) {
    const n = s.oneOf.filter(sch => passes(sch, value)).length;
    if (n !== 1) add(n === 0 ? 'matches none of the allowed shapes (oneOf)' : 'matches more than one shape (oneOf)');
  }
  if (s.not !== undefined && passes(s.not, value)) add('matches a shape that is not allowed (not)');
  if (s.if !== undefined) {
    if (passes(s.if, value)) { if (s.then !== undefined) sub(s.then, value, path); }
    else if (s.else !== undefined) sub(s.else, value, path);
  }
}
