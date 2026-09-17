import path from 'path';
import { fileURLToPath } from 'url';
import type { EmailAdapter } from 'payload';

import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { payloadEnv } from './payload-env';
import { Media } from './collections/Media';
import { Posts } from './collections/Posts';
import { BlogAuthors } from './collections/BlogAuthors';
import { migrations } from './src/migrations';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Tiny console-only email adapter (dev convenience; Payload 3.89 does not
// export its built-in consoleEmailAdapter publicly).
const consoleEmailAdapter: EmailAdapter<void> = ({ payload }) => ({
  name: 'console',
  defaultFromAddress: 'dev@subscrr.local',
  defaultFromName: 'Subscrr (dev)',
  sendEmail: async (message) => {
    payload.logger.info(`[payload:email] → ${String(message.to)}: ${String(message.subject)}`);
    return undefined;
  },
});

export default buildConfig({
  // Omitted in production => Payload generates request-relative URLs (works on
  // any host, including a Render URL known only after first deploy). Set
  // FRONTEND_URL to pin it (reset links, absolute media URLs).
  serverURL: process.env.FRONTEND_URL || undefined,
  routes: {
    // Namespace Payload's REST+GraphQL under /api/payload so it never
    // collides with the Express backend consumed by the dashboard.
    api: '/api/payload',
    admin: '/admin',
    graphQL: '/graphql',
  },
  admin: {
    user: BlogAuthors.slug,
    meta: {
      titleSuffix: '- Subscrr Content',
    },
  },
  collections: [Posts, Media, BlogAuthors],
  db: sqliteAdapter({
    client: {
      url: payloadEnv.dbUri,
    },
    // Production schema strategy: generated migrations (src/migrations) are
    // applied automatically on first connect in production (fresh cloud DB
    // self-provisions). Dev keeps drizzle's schema push.
    prodMigrations: migrations,
  }),
  editor: lexicalEditor(),
  email: consoleEmailAdapter,
  sharp,
  secret: payloadEnv.secret,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
