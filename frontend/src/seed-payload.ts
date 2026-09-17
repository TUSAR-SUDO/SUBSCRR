/**
 * Seed Payload with the existing blog content from content/posts.ts.
 * Run once:  npm run payload:seed
 * Idempotent: skips posts whose slug already exists.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPayload } from 'payload';
import config from '../payload.config';
import { posts } from '../content/posts';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/** Convert our markdown-lite string into a minimal Lexical root node.
 *  Supports: ## / ### headings, > quote, - list, 1. list, blank-line
 *  paragraphs, **bold** / *italic* / `code` inline. */
function mdLiteToLexical(md: string) {
  const inline = (text: string) => {
    // Split on **bold**, *italic*, `code`
    const nodes: any[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) nodes.push({ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: text.slice(last, m.index), version: 1 });
      const tok = m[0];
      if (tok.startsWith('**')) nodes.push({ type: 'text', detail: 0, format: 1, mode: 'normal', style: '', text: tok.slice(2, -2), version: 1 });
      else if (tok.startsWith('`')) nodes.push({ type: 'text', detail: 0, format: 16, mode: 'normal', style: '', text: tok.slice(1, -1), version: 1 });
      else nodes.push({ type: 'text', detail: 0, format: 2, mode: 'normal', style: '', text: tok.slice(1, -1), version: 1 });
      last = m.index + tok.length;
    }
    if (last < text.length) nodes.push({ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: text.slice(last), version: 1 });
    return nodes;
  };

  const paragraph = (text: string) => ({
    type: 'paragraph', format: '' as const, indent: 0, version: 1,
    children: inline(text),
    direction: 'ltr' as const,
  });

  const children: any[] = [];
  const lines = md.split('\n');
  let para: string[] = [];
  let list: { type: 'bullet' | 'number'; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) { children.push(paragraph(para.join(' ').trim())); para = []; }
  };
  const flushList = () => {
    if (list) {
      children.push({
        type: 'list', listType: list.type === 'number' ? 'number' : 'bullet', start: 1, tag: 'ul', indent: 0,
        version: 1,
        children: list.items.map((item) => ({
          type: 'listitem', checked: undefined, value: 1, indent: 0, direction: 'ltr' as const, version: 1,
          children: inline(item),
        })),
      });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(); flushList();
      children.push({
        type: 'heading', tag: (h[1] === '##' ? 'h2' : 'h3') as 'h2' | 'h3', format: '' as const, indent: 0, version: 1,
        children: inline(h[2]),
      });
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara(); flushList();
      children.push({
        type: 'quote', format: '' as const, indent: 0, version: 1,
        children: inline(q[1]),
      });
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) { flushPara(); (list ??= { type: 'bullet', items: [] }).items.push(ul[1]); continue; }
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) { flushPara(); (list ??= { type: 'number', items: [] }).items.push(ol[1]); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();

  return {
    root: {
      type: 'root', format: '' as const, indent: 0, version: 1,
      direction: 'ltr' as const,
      children,
    },
  };
}

async function main() {
  const payload = await getPayload({ config });

  // 1. Admin author
  const existingUsers = await payload.find({ collection: 'blog-authors', limit: 1 });
  let authorId = existingUsers.docs[0]?.id;
  if (!authorId) {
    const created = await payload.create({
      collection: 'blog-authors',
      data: {
        email: process.env.PAYLOAD_ADMIN_EMAIL || 'admin@subscrr.local',
        password: process.env.PAYLOAD_ADMIN_PASSWORD || 'ChangeMe-Payload-2026!',
        name: 'Subscrr Team',
        role: 'admin',
      },
    });
    authorId = created.id;
    console.log('✓ Created admin author:', created.email);
  }

  // 2. Posts (+ hero images as Media)
  let createdCount = 0;
  for (const post of posts) {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: post.slug } },
      limit: 1,
    });
    if (existing.docs.length) {
      console.log(`- skip (exists): ${post.slug}`);
      continue;
    }

    // Upload the hero image from public/assets/blog
    const imgPath = path.join(dirname, '..', 'public', post.image.replace(/^\//, ''));
    const media = await payload.create({
      collection: 'media',
      data: { alt: post.imageAlt },
      filePath: imgPath,
    });

    await payload.create({
      collection: 'posts',
      // Draft-enabled collection: the publish status lives on the doc itself.
      draft: false,
      data: {
        _status: 'published',
        title: post.title,
        excerpt: post.excerpt,
        slug: post.slug,
        category: post.category,
        tags: post.tags.map((t) => ({ tag: t })),
        date: post.date,
        readMinutes: post.readMinutes,
        accent: post.accent,
        featured: Boolean(post.featured),
        heroImage: media.id,
        body: mdLiteToLexical(post.body),
      },
    });
    createdCount++;
    console.log(`✓ seeded: ${post.slug}`);
  }

  console.log(`\nDone. Created ${createdCount} posts. Admin panel: /admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
