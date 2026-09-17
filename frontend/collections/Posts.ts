import type { CollectionConfig } from 'payload';
import { CATEGORIES } from '../content/posts';

/**
 * Posts — the blog. Field-for-field mirror of the original
 * content/posts.ts Post interface so the frontend rendering code
 * barely changes.
 *
 * `body` stays markdown-lite (##, ###, **, -, >, `code`) inside a
 * Lexical paragraph field: editors get a friendly rich-text surface,
 * and the existing ArticleBody renderer keeps working unchanged.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'date', 'featured'],
    description:
      'Blog articles for subscrr.app. Saving as draft hides the post from the site; Publish makes it live immediately.',
  },
  access: {
    read: () => true, // public: the site reads published posts via the Local API
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              label: 'Headline',
            },
            {
              name: 'excerpt',
              type: 'textarea',
              required: true,
              maxLength: 400,
              label: 'Standfirst / card excerpt',
            },
            {
              name: 'body',
              type: 'richText',
              required: true,
              label: 'Article body',
            },
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              required: true,
              label: 'Hero image',
            },
          ],
        },
        {
          label: 'Meta',
          fields: [
            {
              name: 'slug',
              type: 'text',
              unique: true,
              index: true,
              admin: {
                position: 'sidebar',
                description:
                  'URL segment: /blog/<slug>. Locked once published — changing it breaks links.',
              },
              validate: (value: unknown) => {
                const s = String(value ?? '');
                if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) {
                  return 'Use lowercase letters, numbers and dashes only (e.g. free-trials-enjoy-escape)';
                }
                return true;
              },
            },
            {
              name: 'category',
              type: 'select',
              required: true,
              options: CATEGORIES,
              label: 'Category',
            },
            {
              name: 'tags',
              type: 'array',
              label: 'Tags',
              labels: { singular: 'Tag', plural: 'Tags' },
              fields: [{ name: 'tag', type: 'text', required: true }],
            },
            {
              name: 'date',
              type: 'date',
              required: true,
              admin: { date: { pickerAppearance: 'dayOnly' } },
              label: 'Publish date',
            },
            {
              name: 'readMinutes',
              type: 'number',
              required: true,
              defaultValue: 5,
              label: 'Read time (minutes)',
            },
            {
              name: 'accent',
              type: 'text',
              defaultValue: '#FF2500',
              validate: (value: unknown) => {
                if (!/^#[0-9a-fA-F]{6}$/.test(String(value ?? ''))) {
                  return 'Hex color like #FF2500';
                }
                return true;
              },
              admin: { description: 'Accent color for the card chip and article highlights' },
              label: 'Accent color',
            },
            {
              name: 'featured',
              type: 'checkbox',
              defaultValue: false,
              label: 'Feature on blog index',
            },
          ],
        },
      ],
    },
  ],
};
