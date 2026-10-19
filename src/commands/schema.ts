import { Command } from 'commander';
import {
  isGeneratedNamespace,
  methodClassName,
  rootMethodClassName,
  kebabCase,
} from '../generated-registry.js';
import { methodSchema, namespaceSchema, allNamespacesSchema } from './generated.js';

/**
 * `telegram schema [<namespace> [<method>]]` — the machine-readable companion to `--help`. Prints
 * JSON describing the generated API commands so an agent can discover them without scraping help
 * text. It is a pure local lookup (no account, no network), classified as a read.
 *   telegram schema                      → { namespaces:[{namespace,methods}], rootMethods:[…] }
 *   telegram schema messages             → [{ command, className, access, description }, …]
 *   telegram schema messages get-history → { command, className, access, returns, params, example, … }
 *   telegram schema messages.GetHistory  → same (className form also accepted)
 */
export const schemaCommand = new Command('schema')
  .description('Print JSON describing the generated API commands (namespaces, methods, params, access)')
  .argument('[target...]', 'a namespace, a namespace + method, or a <namespace>.<Method> / root method')
  .addHelpText('after', [
    '',
    'Examples:',
    '  telegram schema                       list namespaces + root methods',
    '  telegram schema messages              list a namespace\'s methods (access + description)',
    '  telegram schema messages get-history  full schema for one method (params, example, docs)',
    '  telegram schema ping                  a root-level method',
  ].join('\n'))
  .action((target: string[]) => {
    const out = (obj: unknown) => console.log(JSON.stringify(obj, null, 2));
    const fail = (msg: string) => { console.error(msg); process.exit(1); };

    if (target.length === 0) return out(allNamespacesSchema());

    // Split a single "ns.Method" / "ns.method-kebab" token, else take two tokens.
    let ns: string, methodToken: string | undefined;
    if (target.length === 1 && target[0].includes('.')) {
      const dot = target[0].indexOf('.');
      ns = target[0].slice(0, dot);
      methodToken = target[0].slice(dot + 1);
    } else {
      [ns, methodToken] = target;
    }

    if (methodToken === undefined) {
      // A lone token: a namespace to list, or a root method to describe.
      if (isGeneratedNamespace(ns)) return out(namespaceSchema(ns));
      const rootClass = rootMethodClassName(ns);
      if (rootClass) return out(methodSchema('', ns, rootClass));
      return fail(`Unknown namespace or root method "${ns}". Run "telegram schema" for the list.`);
    }

    if (!isGeneratedNamespace(ns)) return fail(`Unknown namespace "${ns}". Run "telegram schema" for the list.`);
    const methodKebab = methodToken.includes('-') ? methodToken : kebabCase(methodToken);
    const className = methodClassName(ns, methodKebab);
    if (!className) return fail(`Unknown method "${ns} ${methodKebab}". Run "telegram schema ${ns}" for its methods.`);
    return out(methodSchema(ns, methodKebab, className));
  });
