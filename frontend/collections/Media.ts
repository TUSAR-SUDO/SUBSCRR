import type { CollectionConfig } from 'payload';

/**
 * Media — blog imagery. Uploads through the admin panel; Payload + sharp
 * generate responsive size variants automatically. The public URL of any
 * media doc is /media/<filename>.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // Content team only; reading is public via the static route.
    read: () => true,
  },
  upload: {
    // Overridable so cloud deploys can place media on a persistent disk
    // (e.g. PAYLOAD_MEDIA_DIR=/opt/data/media-uploads on Render); defaults to
    // the repo-relative dir used in local dev.
    staticDir: process.env.PAYLOAD_MEDIA_DIR || 'media-uploads',
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'card', width: 960, height: 480, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
      { name: 'thumb', width: 480, height: 240, position: 'centre' },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Alt text (describe the image for screen readers)',
    },
  ],
};
