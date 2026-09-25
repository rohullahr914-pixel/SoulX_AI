// Node-only test harness: transpile project TypeScript without modifying production files.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
export function load(relative) {
  let filename = path.resolve(root, relative);
  if (!path.extname(filename)) filename += '.ts';
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const nativeRequire = createRequire(filename);
  const localRequire = (specifier) => {
    // Next enforces this marker at build time; this harness only runs in Node.
    if (specifier === 'server-only') return {};
    if (specifier.startsWith('@/')) return load('src/' + specifier.slice(2));
    if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), specifier));
    return nativeRequire(specifier);
  };
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  new Function('require', 'module', 'exports', source)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
