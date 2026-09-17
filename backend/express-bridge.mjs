// Bridge so the root unified server (server.mjs) can load Express from this
// package's dependencies — Node resolves imports relative to this file.
import express from 'express';

export default express;
