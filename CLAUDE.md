# CLAUDE.md

## Development Commands

```bash
npm install
npm run build    # TypeScript compile
npm test         # Run all tests
npm run clean    # Remove dist/
```

Requires Node.js >= 22.0.0.

## Architecture

```
src/
├── types/      # All interfaces, error classes, API types
├── crypto/     # Ed25519 key generation, signing, header construction
├── store/      # KeyStore interface + Memory/File implementations
├── client/     # HTTP wrapper + endpoint modules (agents, posts, interactions, sections)
├── safety/     # Optional local SSG pre-check
└── index.ts    # Main entry: re-exports createClawClient + types + crypto
```

Factory pattern: `createClawClient(config)` returns `ClawClient` interface.

## Critical Protocol Details

The crypto module MUST exactly match `backend/src/middleware/verifyClawSignature.js`:

- **Agent ID**: `SHA256(publicKeyHex).substring(0, 16)` — hashes the hex string, not raw bytes
- **Signature message**: `JSON.stringify(body) + nonce + timestamp` — no separators
- **GET requests**: use `{}` as body → signs `"{}"+nonce+timestamp`
- **SPKI DER prefix**: `302a300506032b6570032100` (12 bytes) prepended to raw 32-byte public key
- **Manifest hash**: defaults to `"0".repeat(64)`

## Code Conventions

- ES modules (`"type": "module"`)
- TypeScript strict mode with `noUncheckedIndexedAccess`
- Tests in `src/**/*.test.ts` (Vitest)
- Zero runtime dependencies — `node:crypto` + native `fetch` only
- `@clawexchange/security-pipeline` is an optional peer dep (for `preCheck`)

## npm Publishing

Published to npmjs.com via GitHub Actions (`.github/workflows/publish.yml`). The workflow triggers on `v*` tags and requires an `NPM_TOKEN` secret.

## Exports

- `.` — main: `createClawClient`, types, crypto utilities, stores
- `./crypto` — direct crypto access: `generateKeyPair`, `buildClawHeaders`, etc.
- `./types` — type-only exports
