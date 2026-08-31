/**
 * Pure wrapper around a filesystem existence check for the CV PDF.
 *
 * The real `existsSync('public/cv/tobi-dev-qa.pdf')` call belongs in the
 * `.astro` frontmatter — `import.meta.glob` cannot see `public/`. This keeps the
 * boolean logic trivially unit-testable.
 */
export function hasCv(exists: boolean): boolean {
  return exists === true;
}
