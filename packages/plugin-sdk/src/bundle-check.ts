import { parse } from "acorn";
import type { Comment, Node, Options } from "acorn";

const PARSE: Options = {
  ecmaVersion: 2023,
  sourceType: "module",
  allowHashBang: false,
};

interface AnyNode extends Node {
  [key: string]: unknown;
}

const isNode = (v: unknown): v is AnyNode =>
  !!v && typeof v === "object" && typeof (v as Node).type === "string";

function walk(
  node: AnyNode,
  visit: (node: AnyNode, parent: AnyNode | undefined, key: string) => void,
  parent?: AnyNode,
  key = ""
): void {
  visit(node, parent, key);
  for (const [k, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          walk(item, visit, node, k);
        }
      }
    } else if (isNode(value)) {
      walk(value, visit, node, k);
    }
  }
}

function program(code: string, comments?: Comment[]): AnyNode {
  try {
    return parse(code, {
      ...PARSE,
      ...(comments ? { onComment: comments } : {}),
    }) as unknown as AnyNode;
  } catch (error) {
    throw new Error(
      `The bundle is not ES2023, the language QuickJS runs: ${(error as Error).message}`,
      { cause: error }
    );
  }
}

function lineOf(code: string, c: Comment): [number, number] | undefined {
  const start = code.lastIndexOf("\n", c.start - 1) + 1;
  if (code.slice(start, c.start).trim()) {
    return undefined;
  }
  const nl = code.indexOf("\n", c.end);
  const end = nl === -1 ? code.length : nl + 1;
  return code.slice(c.end, end).trim() ? undefined : [start, end];
}

/** Removes the comment tokens `// <input path>` that Bun writes above each bundled module, each with its line; strings and templates are never touched. */
export function withoutModuleMarkers(code: string, inputs: string[]): string {
  const comments: Comment[] = [];
  program(code, comments);
  const markers = new Set(inputs.map((path) => ` ${path}`));
  const cuts = comments
    .filter((c) => c.type === "Line" && markers.has(c.value))
    .map((c) => lineOf(code, c))
    .filter((cut): cut is [number, number] => !!cut);
  let out = "";
  let at = 0;
  for (const [start, end] of cuts) {
    out += code.slice(at, start);
    at = end;
  }
  return out + code.slice(at);
}

function exportedName(node: AnyNode): string {
  return node.type === "Identifier"
    ? String(node.name)
    : String((node as { value?: unknown }).value);
}

function exportsOf(ast: AnyNode): string[] {
  const names: string[] = [];
  for (const node of ast.body as AnyNode[]) {
    if (node.type === "ExportNamedDeclaration") {
      for (const s of (node.specifiers as AnyNode[] | undefined) ?? []) {
        names.push(exportedName(s.exported as AnyNode));
      }
      const decl = node.declaration as AnyNode | null;
      if (decl?.type === "VariableDeclaration") {
        for (const d of decl.declarations as AnyNode[]) {
          walk(d.id as AnyNode, (n, parent, key) => {
            if (
              n.type === "Identifier" &&
              !(
                parent?.type === "Property" &&
                key === "key" &&
                !parent.computed
              )
            ) {
              names.push(String(n.name));
            }
          });
        }
      } else if (decl && isNode(decl.id)) {
        names.push(String(decl.id.name));
      }
    } else if (node.type === "ExportDefaultDeclaration") {
      names.push("default");
    }
  }
  return names;
}

function isReference(parent: AnyNode | undefined, key: string): boolean {
  if (!parent) {
    return true;
  }
  if (parent.type === "MemberExpression" && key === "property") {
    return !!parent.computed;
  }
  if (
    (parent.type === "Property" ||
      parent.type === "MethodDefinition" ||
      parent.type === "PropertyDefinition") &&
    key === "key"
  ) {
    return !!parent.computed;
  }
  return !(
    parent.type === "LabeledStatement" ||
    parent.type === "BreakStatement" ||
    parent.type === "ContinueStatement"
  );
}

/**
 * Checks the final bundle as QuickJS will load it: ES2023 syntax, no module it would import
 * (`import`, `export … from`, `import()`, `require`), and `commands` among its exports. Returns the
 * names it exports.
 */
export function checkBundle(code: string): string[] {
  const ast = program(code);
  const found = new Set<string>();
  walk(ast, (node, parent, key) => {
    switch (node.type) {
      case "ImportDeclaration": {
        found.add(`import from "${String((node.source as AnyNode).value)}"`);
        break;
      }
      case "ExportAllDeclaration": {
        found.add(`export * from "${String((node.source as AnyNode).value)}"`);
        break;
      }
      case "ExportNamedDeclaration": {
        if (node.source) {
          found.add(`export from "${String((node.source as AnyNode).value)}"`);
        }
        break;
      }
      case "ImportExpression": {
        found.add("import()");
        break;
      }
      case "Identifier": {
        if (node.name === "require" && isReference(parent, key)) {
          found.add("require");
        }
        break;
      }
      default: {
        break;
      }
    }
  });
  if (found.size) {
    throw new Error(
      `The bundle still loads modules (${[...found].sort().join(", ")}); a plugin is one file without imports, so import only what can be inlined and never load code by name`
    );
  }
  const names = exportsOf(ast);
  if (!names.includes("commands")) {
    throw new Error(
      `The bundle does not export \`commands\` (it exports ${names.length ? names.join(", ") : "nothing"}): export it from the entry (export const { commands } = definePlugin({ … }))`
    );
  }
  return names;
}
