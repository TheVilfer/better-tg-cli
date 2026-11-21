const EXPORTS = new Set(["ExportNamedDeclaration", "ExportDefaultDeclaration"]);
const CLASS_MEMBERS = new Set([
  "MethodDefinition",
  "PropertyDefinition",
  "AccessorProperty",
  "TSAbstractMethodDefinition",
  "TSAbstractPropertyDefinition",
  "TSAbstractAccessorProperty",
  "TSIndexSignature",
]);
const CLASSES = new Set(["ClassDeclaration", "ClassExpression"]);

const isJsDoc = (comment) =>
  comment.type === "Block" &&
  comment.value.startsWith("*") &&
  !comment.value.startsWith("**");

const isExportedDeclaration = (node) =>
  EXPORTS.has(node.type) &&
  (node.type === "ExportDefaultDeclaration" || node.declaration != null);

const isPublicMemberOfExportedClass = (node) => {
  if (!CLASS_MEMBERS.has(node.type)) {
    return false;
  }
  if (
    node.key?.type === "PrivateIdentifier" ||
    node.accessibility === "private"
  ) {
    return false;
  }
  const owner = node.parent?.parent;
  return (
    owner != null &&
    CLASSES.has(owner.type) &&
    owner.parent != null &&
    isExportedDeclaration(owner.parent)
  );
};

const documentedNode = (sourceCode, comment) => {
  const next = sourceCode.getTokenAfter(comment, { includeComments: true });
  if (next == null || next.type === "Block" || next.type === "Line") {
    return null;
  }
  if (sourceCode.text.slice(comment.range[1], next.range[0]).trim() !== "") {
    return null;
  }
  for (
    let node = sourceCode.getNodeByRangeIndex(next.range[0]);
    node != null && node.range[0] === next.range[0];
    node = node.parent
  ) {
    if (isExportedDeclaration(node) || isPublicMemberOfExportedClass(node)) {
      return node;
    }
  }
  return null;
};

const isAllowed = (sourceCode, comment) =>
  comment.type === "Shebang" ||
  (isJsDoc(comment) && documentedNode(sourceCode, comment) != null);

const noComments = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Code files carry no comments: a shebang, and JSDoc directly above an exported declaration or a public member of an exported class, are the only exceptions.",
    },
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (!isAllowed(sourceCode, comment)) {
            context.report({
              loc: comment.loc,
              message:
                "No comments in code: put the why in a name, a JSDoc on an export, or docs/.",
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "better-tg-cli" },
  rules: { "no-comments": noComments },
};
