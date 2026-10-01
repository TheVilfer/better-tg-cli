import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIME, mimeStubSource } from '../scripts/mime-stub.mjs';

const require = createRequire(import.meta.url);
const mime = require('mime');

function loadStub(): Record<string, (x: string) => string | null> {
  const module = { exports: {} as Record<string, never> };
  new Function('exports', 'module', mimeStubSource)(module.exports, module);
  return module.exports;
}

function jsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : jsFiles(path);
    return path.endsWith('.js') ? [path] : [];
  });
}

describe('mime stub in the bundle', () => {
  const stub = loadStub();

  it('implements every mime function teleproto calls', () => {
    const used = new Set<string>();
    for (const file of jsFiles('node_modules/teleproto')) {
      for (const m of readFileSync(file, 'utf8').matchAll(/mime_1\.default\.([A-Za-z]+)/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(typeof stub[name], `mime.${name}`).toBe('function');
  });

  it('agrees with the real mime package', () => {
    for (const [ext, type] of Object.entries(MIME)) {
      expect(stub.getType(`file.${ext.toUpperCase()}`)).toBe(type);
      expect(mime.getType(`file.${ext}`), ext).toBe(type);
      const back = stub.getExtension(type);
      expect(back).toBeTruthy();
      expect(mime.getType(`file.${back}`), type).toBe(type);
    }
  });

  it('names office documents and falls back on unknown types', () => {
    expect(stub.getExtension('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
    expect(stub.getExtension('application/pdf; charset=binary')).toBe('pdf');
    expect(stub.getExtension('application/x-unknown')).toBeNull();
    expect(stub.getType('noext')).toBeNull();
  });
});
