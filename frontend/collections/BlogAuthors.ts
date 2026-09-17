import type { CollectionConfig } from 'payload';

/**
 * BlogAuthors — login accounts for the Payload admin panel ONLY.
 * Deliberately separate from the app's user table (Express backend):
 * content editors never need subscription data, and app users never
 * need the admin panel.
 */
export const BlogAuthors: CollectionConfig = {
  slug: 'blog-authors',
  auth: true,
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true, // author names are public on posts
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'editor',
      options: ['editor', 'admin'],
      required: true,
    },
  ],
};
