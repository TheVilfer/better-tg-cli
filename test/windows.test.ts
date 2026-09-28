import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dpapiStore, encodedCommand, type Crypter } from '../src/dpapi.js';
import { windowsConfirmScript } from '../src/commands/write-access.js';

// Stands in for DPAPI on any OS: reversible, but the file must not contain the plaintext
const fake: Crypter & { calls: number } = {
  calls: 0,
  protect(b64) { this.calls++; return 'X' + [...b64].reverse().join(''); },
  unprotect(blob) { this.calls++; return [...blob.slice(1)].reverse().join(''); },
};

describe('DPAPI secret store', () => {
  it('keeps every secret in one encrypted file and decrypts once per process', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'tg-dpapi-')), 'secrets.dpapi');
    const store = dpapiStore(() => file, fake);
    expect(store.get('sessionString')).toBeNull();
    expect(store.set('sessionString', 'SESSION-ÄЖ-😀')).toBe(true);
    expect(store.set('writeEnabled', '1')).toBe(true);
    expect(readFileSync(file, 'utf8')).not.toContain('SESSION');

    const fresh = dpapiStore(() => file, fake);
    fake.calls = 0;
    expect(fresh.get('sessionString')).toBe('SESSION-ÄЖ-😀');
    expect(fresh.get('writeEnabled')).toBe('1');
    expect(fake.calls).toBe(1); // cached after the first read

    expect(fresh.delete('writeEnabled')).toBe(true);
    expect(dpapiStore(() => file, fake).get('writeEnabled')).toBeNull();
    expect(fresh.delete('sessionString')).toBe(true);
    expect(existsSync(file)).toBe(false); // nothing left, no file
  });

  it('reads nothing from a file it cannot decrypt', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'tg-dpapi-')), 'secrets.dpapi');
    dpapiStore(() => file, fake).set('k', 'v');
    const broken = dpapiStore(() => file, { protect: () => { throw new Error('no'); }, unprotect: () => { throw new Error('no'); } });
    expect(broken.get('k')).toBeNull();
    expect(broken.set('k', 'w')).toBe(false);
  });

  it('encodes PowerShell commands as UTF-16LE base64', () => {
    const script = "Write-Output 'Привет'";
    expect(Buffer.from(encodedCommand(script), 'base64').toString('utf16le')).toBe(script);
  });

  it.runIf(process.platform === 'win32')('round-trips through real DPAPI', async () => {
    const { dpapiStore: real } = await import('../src/dpapi.js');
    const file = join(mkdtempSync(join(tmpdir(), 'tg-dpapi-')), 'secrets.dpapi');
    const store = real(() => file);
    let t = Date.now();
    expect(store.set('sessionString', 'real-secret-ÄЖ')).toBe(true);
    console.log(`DPAPI protect: ${Date.now() - t} ms`);
    expect(readFileSync(file, 'utf8')).not.toContain('real-secret');
    t = Date.now();
    expect(real(() => file).get('sessionString')).toBe('real-secret-ÄЖ');
    console.log(`DPAPI unprotect: ${Date.now() - t} ms`);
  }, 60_000);
});

describe('Windows write-access confirmation', () => {
  it('quotes the text for PowerShell and defaults to No', () => {
    const script = windowsConfirmScript("It's «ok»?\nSecond line");
    expect(script).toContain("'It''s «ok»?\nSecond line'");
    expect(script).toContain("'YesNo', 'Warning', 'Button2'");
    expect(script).toContain('TopMost = $true');
  });

  it.runIf(process.platform === 'win32')('parses as valid PowerShell', () => {
    const ps = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const file = join(mkdtempSync(join(tmpdir(), 'tg-ps-')), 'confirm.ps1');
    writeFileSync(file, '\ufeff' + windowsConfirmScript("It's a test"), 'utf8');
    const check = `$e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${file.replace(/'/g, "''")}', [ref]$null, [ref]$e); [Console]::Out.Write($e.Count)`;
    const res = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand(check)], { encoding: 'utf8', windowsHide: true });
    expect(res.stdout.trim()).toBe('0');
  });
});

describe('Scoop manifest', () => {
  it('points at the release zip with its checksum', async () => {
    const { scoopManifest } = await import('../scripts/scoop-manifest.mjs');
    const sums = 'aaa  better-tg-cli-1.2.3-darwin-arm64.tar.xz\nbbb  better-tg-cli-1.2.3-windows-x64.zip\n';
    const m = scoopManifest('1.2.3', sums);
    expect(m.version).toBe('1.2.3');
    expect(m.architecture['64bit']).toEqual({
      url: 'https://github.com/TheVilfer/better-tg-cli/releases/download/v1.2.3/better-tg-cli-1.2.3-windows-x64.zip',
      hash: 'bbb',
    });
    expect(m.bin).toBe('telegram.exe');
    expect(() => scoopManifest('9.9.9', sums)).toThrow(/No checksum/);
  });
});
