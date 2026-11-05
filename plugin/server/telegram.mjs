#!/usr/bin/env node
// Better-TG-CLI 0.39.2: the telegram CLI and its MCP server, run by the Claude plugin.
// cli/*.js is one readable (not minified) CommonJS bundle of https://github.com/TheVilfer/better-tg-cli
// at v0.39.2, built by `bun scripts/bundle.mjs plugin` and cut into parts under 256 KiB. The parts
// are not separate modules: this file joins them in order and runs the result, like dist/telegram.mjs.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const file = fileURLToPath(import.meta.url);
const dir = dirname(file);
const parts = ["01.js","02.js","03.js","04.js","05.js","06.js","07.js","08.js","09.js","10.js","11.js","12.js","13.js","14.js","15.js","16.js","17.js","18.js"];
const code = parts.map(p => readFileSync(join(dir, 'cli', p), 'utf8')).join('');
const module = { exports: {} };
new Function('exports', 'require', 'module', '__filename', '__dirname', code)(module.exports, createRequire(file), module, file, dir);
