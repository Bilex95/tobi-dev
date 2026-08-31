/**
 * SEO helpers: meta-tag assembly, canonical URLs, and JSON-LD nodes.
 *
 * Plain TypeScript with no Node-only dependencies so it is import-safe from
 * `.astro` frontmatter at build time and from `node:test` units.
 */

export const SITE = 'https://tobi-dev.vercel.app';

const GITHUB_URL = 'https://github.com/Bilex95';
const LINKEDIN_URL = 'https://www.linkedin.com/in/oluwatobiloba-bilewu';
const PERSON_NAME = 'Oluwatobiloba Bilewu';
const PERSON_TITLE = 'QA automation & AI engineer';
const DEFAULT_OG_IMAGE = `${SITE}/og/default.png`;

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface Meta {
  title: string;
  tags: MetaTag[];
  canonical: string;
}

/** Normalise a route path to an absolute canonical URL with no trailing-slash dupes. */
export function canonicalUrl(path: string): string {
  if (!path || path === '/') return `${SITE}/`;
  const clean = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean === '/' ? `${SITE}/` : SITE + clean;
}

export function buildMeta(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Meta {
  const { title, description, path } = input;
  const canonical = canonicalUrl(path);
  const image = input.image ?? DEFAULT_OG_IMAGE;

  const tags: MetaTag[] = [
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];

  return { title, tags, canonical };
}

export interface PersonLd {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;
  url: string;
  jobTitle: string;
  sameAs: string[];
}

export function personJsonLd(): PersonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: PERSON_NAME,
    url: SITE,
    jobTitle: PERSON_TITLE,
    sameAs: [GITHUB_URL, LINKEDIN_URL],
  };
}

/** The Person node without its own `@context` — for nesting inside another node. */
export type AuthorLd = Omit<PersonLd, '@context'>;

export interface ArticleLd {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description: string;
  mainEntityOfPage: string;
  author: AuthorLd;
  datePublished?: string;
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  datePublished?: string;
  path: string;
}): ArticleLd {
  const { '@context': _context, ...author } = personJsonLd();
  const ld: ArticleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: canonicalUrl(input.path),
    author,
  };
  if (input.datePublished) ld.datePublished = input.datePublished;
  return ld;
}
