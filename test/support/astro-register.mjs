// Registers the .astro ESM loader hooks. Pass to node via `--import`.
import { register } from 'node:module';

register('./astro-hooks.mjs', { parentURL: import.meta.url });
