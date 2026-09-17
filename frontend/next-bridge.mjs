// Bridge so the root unified server (server.mjs) can load Next.js from this
// package's dependencies — Node resolves imports relative to this file.
import next from 'next';

export default next;
