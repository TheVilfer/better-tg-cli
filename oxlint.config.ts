import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import vitest from "ultracite/oxlint/vitest";

import { fixtures, generatedCode } from "./scripts/lint/generated.mjs";

const unsafeAutofix: Record<string, string> = {
  "typescript/consistent-indexed-object-style":
    "its autofix rewrites the recursive mapped type Style in src/colors.ts into a circular Record",
  "unicorn/no-unnecessary-await":
    "its autofix removes await on a non-promise, which changes microtask order",
  "unicorn/no-useless-spread":
    "its autofix drops the spread in [...string] and calls reverse() on a string",
  "unicorn/no-useless-undefined":
    "its autofix drops the explicit undefined that keeps a Promise<string | undefined> typed",
  "unicorn/prefer-at":
    "its autofix turns arr[arr.length - 1] into arr.at(-1), which is T | undefined and breaks the types",
  "unicorn/prefer-query-selector":
    "the onboarding page tests fake getElementById only, and its autofix rewrites it",
  "unicorn/prefer-type-error":
    "its autofix turns user-facing Error into TypeError, which changes the error name callers see",
  "unicorn/prefer-set-has":
    "its autofix turns a typed readonly array into a Set and leaves the array type behind",
  "vitest/consistent-test-it":
    "its autofix renames top-level it() to test() without importing test",
};

const testsOnly: Record<string, string> = {
  "import/first": "vi.mock() calls must run before the imports they replace",
};

const houseStyle: Record<string, string> = {
  "unicorn/prefer-response-static-json":
    "the broker and the test servers build JSON responses with their own headers and status",
  "unicorn/custom-error-definition":
    "error classes keep the name Error that callers, tests and the audit already see",
  "no-template-curly-in-string":
    "strings such as ${PLUGIN_DATA} and ${#v} are literal text for other programs and shells",
  "class-methods-use-this":
    "methods of fakes and transports keep their interface even without this",
  complexity:
    "command handlers branch on many flags; splitting them is a refactor of its own",
  "default-case":
    "switches over TypeScript unions are checked for exhaustiveness by the compiler",
  eqeqeq: "== null deliberately matches both null and undefined",
  "func-names":
    "an anonymous function expression is passed straight to its caller",
  "func-style":
    "the code base uses function declarations: hoisted and named in stack traces",
  "import/no-cycle":
    "the broker handler and signup modules reference each other only inside functions",
  "max-classes-per-file":
    "small error and fake classes live next to the code that throws or uses them",
  "no-await-in-loop":
    "sequential awaits are deliberate: Telegram flood limits, ordered writes and paging",
  "no-bitwise":
    "MTProto flags, IP address math and hashing need bitwise operators",
  "no-control-regex":
    "matching control characters is the point where terminal output and headers are sanitized",
  "no-div-regex": "a regex that starts with = is not ambiguous in its context",
  "no-empty":
    "an empty catch deliberately ignores a best-effort step that may fail",
  "no-empty-function":
    "no-op callbacks such as catch(() => {}) and test stubs are intended",
  "no-eq-null": "== null deliberately matches both null and undefined",
  "no-inline-comments":
    "comments are governed by the project's own no-comments rule",
  "no-loop-func":
    "the closures in these loops read the loop variable of their own iteration",
  "no-multi-assign":
    "chained assignment updates a cache and a local value in one step",
  "no-nested-ternary":
    "short nested ternaries pick CLI output text; oxfmt lays them out readably",
  "no-new-func":
    "two tests build a function from bundle text to run it in isolation",
  "no-param-reassign": "a few helpers normalize their own arguments in place",
  "no-plusplus": "i++ in loops and counters is idiomatic here",
  "no-promise-executor-return":
    "one-line executors such as new Promise((r) => setTimeout(r, ms)) are intended",
  "no-sequences":
    "the comma operator appears only in compact test fakes and one sandbox bridge",
  "no-shadow":
    "the shadowing names are local and short-lived; renaming them is churn without a bug behind it",
  "no-unmodified-loop-condition":
    "the loop condition changes inside an awaited callback the rule cannot see",
  "no-use-before-define":
    "function declarations are hoisted; helpers live below the code that reads them",
  "no-void": "void marks a promise that is fire-and-forget on purpose",
  "node/callback-return":
    "callbacks in test servers end the response without returning it",
  "oxc/branches-sharing-code":
    "the shared tail keeps each branch readable on its own",
  "prefer-destructuring":
    "plain property reads are clearer than destructuring in these assignments",
  "prefer-named-capture-group":
    "short patterns with one or two groups read better with numbered groups",
  "promise/always-return":
    "then() callbacks that only cause side effects return nothing on purpose",
  "promise/avoid-new":
    "callback and event APIs (sockets, child processes, timers) need new Promise",
  "promise/catch-or-return":
    "the promise is handled by a listener or deliberately left to run",
  "promise/no-nesting": "the nested then() needs the outer value in scope",
  "promise/param-names":
    "short executor names (r, ok, fail) are used throughout",
  "promise/prefer-await-to-callbacks":
    "Node's callback APIs (sockets, servers, streams) are used directly",
  "promise/prefer-catch":
    "then(ok, fail) handles only the promise's own failure, not one thrown by ok",
  "require-await":
    "async keeps a function's contract (always a promise) where the body has nothing to await",
  "require-unicode-regexp":
    "the u flag changes how existing patterns parse (escapes, classes), so each of 1 150 would need a review",
  "typescript/method-signature-style":
    "method shorthand in interfaces is the house style",
  "typescript/no-dynamic-delete":
    "deleting keys of config and cache records by name is intended",
  "typescript/no-explicit-any":
    "any is limited to teleproto's untyped TL internals and test doubles",
  "typescript/no-non-null-assertion":
    "teleproto's TL objects are loosely typed; ! marks fields the protocol always sets",
  "typescript/parameter-properties":
    "constructor parameter properties keep small error and transport classes short",
  "unicorn/consistent-function-scoping":
    "closures sit next to their only caller on purpose",
  "unicorn/import-style":
    "named imports from node: modules are the house style",
  "unicorn/no-array-for-each":
    "forEach is used where a callback reads better than a loop",
  "unicorn/no-array-reduce": "reduce builds a value in one expression here",
  "unicorn/no-array-reverse":
    "reverse() runs on a fresh array, so toReversed() adds nothing",
  "unicorn/no-array-sort":
    "sort() runs on a fresh array, so toSorted() adds nothing",
  "unicorn/no-await-expression-member":
    "(await x).y is used in tests and reads fine",
  "unicorn/no-immediate-mutation":
    "a list started with one item and then pushed to reads in output order",
  "unicorn/no-negated-condition": "the negated branch is the common case",
  "unicorn/no-object-as-default-parameter":
    "the defaults are small option objects",
  "unicorn/no-unreadable-array-destructuring":
    "tests pick one column of a fixed TL tuple",
  "unicorn/prefer-code-point":
    "the code handles bytes and ASCII, where charCodeAt is exact",
  "unicorn/prefer-export-from":
    "a module that imports a name for its own use also re-exports it",
  "unicorn/prefer-logical-operator-over-ternary":
    "the ternary keeps a falsy but valid value such as 0",
  "unicorn/prefer-module": "the CommonJS __dirname appears in tests on purpose",
  "unicorn/prefer-number-coercion":
    "parseInt-style parsing of digit groups is intended",
  "unicorn/prefer-single-call":
    "one push per output line keeps formatters readable",
  "unicorn/prefer-structured-clone":
    "a JSON round trip is intended: it drops undefined and non-JSON values",
  "unicorn/prefer-ternary": "the if/else form reads better in these places",
  "unicorn/require-post-message-target-origin":
    "postMessage goes to a worker or port, which takes no target origin",
  "jsdoc/require-yields": "generator JSDoc describes the values in prose",
  "vitest/expect-expect":
    "these tests assert through helpers or by not throwing",
  "vitest/max-expects": "tests check whole scenarios end to end on purpose",
  "vitest/no-conditional-expect":
    "platform branches in tests assert different things per OS",
  "vitest/no-duplicate-hooks":
    "a second afterAll cleans up what a later setup step made",
  "vitest/no-standalone-expect":
    "shared assertion helpers call expect outside a test block",
  "vitest/prefer-called-with": "the test checks only that a call happened",
  "vitest/prefer-each":
    "loops over cases inside one test share setup that each() would repeat",
  "vitest/prefer-hooks-in-order": "hooks follow the setup steps they belong to",
  "vitest/prefer-strict-equal":
    "toEqual on plain data is intended; toStrictEqual also compares undefined fields and classes",
  "vitest/prefer-to-be-falsy":
    "toBe(false) asserts a real boolean, which toBeFalsy would not",
  "vitest/prefer-to-be-truthy":
    "toBe(true) asserts a real boolean, which toBeTruthy would not",
  "vitest/require-mock-type-parameters":
    "vi.fn() infers its type from the implementation",
  "vitest/require-to-throw-message":
    "these tests check only that a call throws",
  "vitest/require-top-level-describe":
    "files with few tests keep them at the top level",
  "vitest/valid-expect":
    "vitest's expect(value, message) second argument labels assertions",
};

const off = (reasons: Record<string, string>) =>
  Object.fromEntries(Object.keys(reasons).map((rule) => [rule, "off"]));
const rules = off({ ...unsafeAutofix, ...houseStyle });

export default defineConfig({
  env: { ...core.env, browser: false, node: true },
  extends: [core, vitest],
  ignorePatterns: [...core.ignorePatterns, ...generatedCode, ...fixtures],
  jsPlugins: ["./scripts/lint/no-comments.mjs"],
  overrides: [
    {
      files: ["**/*.test.ts"],
      plugins: ["vitest"],
      rules: { ...rules, ...off(testsOnly) },
    },
  ],
  rules: { ...rules, "better-tg-cli/no-comments": "error" },
});
