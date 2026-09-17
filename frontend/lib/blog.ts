import { getPayload } from 'payload';
import config from '@/payload.config';
import type { Post, PostCategory } from '@/content/posts';
import type { Post as PayloadPost, Media } from '@/payload-types';

/**
 * Adapter between Payload (content DB) and the blog UI.
 *
 * The rendering components (BlogIndex, ArticleBody, [slug]/page) still speak
 * the original `Post` shape from content/posts.ts. This module queries
 * Payload's Local API (in-process, no HTTP) and re-shapes results into that
 * shape, so the entire UI layer needed zero structural changes to swap its
 * data source from hardcoded TS to the CMS.
 *
 * The Lexical `body` is stored as rich-text JSON; we flatten it back to the
 * markdown-lite string the existing renderer parses (##, **, -, >, `code`).
 */

export interface PayloadPostWithMedia extends Omit<PayloadPost, 'heroImage'> {
  heroImage: Media; // populated via depth: 1
}

function lexicalToMdLite(node: PayloadPost['body']): string {
  const lines: string[] = [];
  const root = node?.root as
    | { children?: any[]; direction?: string | null; format?: string; indent?: number; version?: number; type?: string }
    | undefined;
  if (!root || !Array.isArray(root.children)) return '';

  const inlineToText = (children: any[]): string =>
    (children || [])
      .map((child: any) => {
        if (child.type !== 'text') return inlineToText(child.children || []);
        let text = child.text ?? '';
        if (child.format & 1) text = `**${text}**`; // bold
        if (child.format & 2) text = `*${text}*`; // italic
        if (child.format & 16) text = `\`${text}\``; // code
        return text;
      })
      .join('');

  for (const child of root.children as any[]) {
    switch (child.type) {
      case 'heading':
        lines.push(`${child.tag === 'h2' ? '##' : '###'} ${inlineToText(child.children)}`);
        lines.push('');
        break;
      case 'quote':
        lines.push(`> ${inlineToText(child.children)}`);
        lines.push('');
        break;
      case 'list':
        for (const item of child.children || []) {
          const prefix = child.listType === 'number' ? '1. ' : '- ';
          lines.push(`${prefix}${inlineToText(item.children)}`);
        }
        lines.push('');
        break;
      case 'paragraph':
      default:
        lines.push(inlineToText(child.children));
        lines.push('');
        break;
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function toAppPost(doc: PayloadPostWithMedia): Post {
  const hero = doc.heroImage as Media | undefined;
  // Payload returns absolute media URLs (serverURL + path). next/image only
  // accepts same-origin RELATIVE paths without extra remotePatterns config,
  // so strip any origin — media is always served by this app.
  const imageUrl = hero?.url
    ? new URL(hero.url, 'http://internal.invalid').pathname
    : '/assets/blog/wakeup-call.jpg';
  return {
    slug: doc.slug ?? '',
    title: doc.title,
    excerpt: doc.excerpt,
    date: typeof doc.date === 'string' ? doc.date.slice(0, 10) : new Date(doc.date).toISOString().slice(0, 10),
    readMinutes: doc.readMinutes ?? 5,
    category: doc.category as PostCategory,
    tags: (doc.tags ?? []).map((t) => t.tag).filter(Boolean),
    accent: doc.accent ?? '#FF2500',
    image: imageUrl,
    imageAlt: hero?.alt ?? doc.title,
    featured: Boolean(doc.featured),
    body: lexicalToMdLite(doc.body),
  };
}

export async function getPayloadClient() {
  return getPayload({ config });
}

/** All published posts, newest first. */
export async function getPublishedPosts(): Promise<Post[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 100,
    sort: '-date',
    where: {
      _status: { equals: 'published' },
    },
  });
  return (result.docs as unknown as PayloadPostWithMedia[]).map(toAppPost);
}

/** One published post by slug, or null. */
export async function getPublishedPost(slug: string): Promise<Post | null> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 1,
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
  });
  const doc = result.docs[0];
  return doc ? toAppPost(doc as PayloadPostWithMedia) : null;
}

/** All published slugs (for sitemap + generateStaticParams). */
export async function getPublishedSlugs(): Promise<string[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: 100,
    select: { slug: true },
    where: { _status: { equals: 'published' } },
  });
  return result.docs.map((d) => d.slug).filter((s): s is string => Boolean(s));
}
