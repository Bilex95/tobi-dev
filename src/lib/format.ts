/**
 * Shared date helpers so pages and layouts render dates identically.
 *
 * `formatDate` is the human-facing form; `isoDate` is the machine form for
 * `<time datetime>` attributes and `datePublished` JSON-LD values.
 */

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
