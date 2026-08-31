// Node ESM loader hooks that let `node --test` import `.astro` components.
// Compiles the component with @astrojs/compiler (same output as an Astro build),
// then strips TypeScript from the frontmatter with esbuild. Only `.astro` files
// are handled here; everything else is delegated down the hook chain (tsx).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from '@astrojs/compiler';
import { transform as esbuildTransform } from 'esbuild';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.astro')) {
    const url = new URL(specifier, context.parentURL).href;
    return { url, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.astro')) {
    const filename = fileURLToPath(url);
    const source = await readFile(filename, 'utf8');
    const { code } = await transform(source, {
      filename,
      normalizedFilename: filename,
      sourcemap: false,
      internalURL: 'astro/compiler-runtime',
      resolvePath: async (spec) => spec,
    });
    const { code: js } = await esbuildTransform(code, {
      loader: 'ts',
      format: 'esm',
      target: 'node20',
      sourcemap: false,
    });
    return { format: 'module', source: js, shortCircuit: true };
  }
  return nextLoad(url, context);
}
