/**
 * Global Jest setup — runs once before each test file's modules are loaded.
 *
 * Sets deterministic environment variables so that:
 *  - the JWT auth middleware can verify/issue tokens with a known secret,
 *  - the pg Pool is created against a fake DATABASE_URL (lazy — never connects),
 *  - ORS / mobile-money providers are disabled so tests never hit real APIs.
 */
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
// Deliberately fake — tests mock the pool/database, so no real connection is made.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_not_real';
// Disable external routing API so tracking falls back to the straight-line estimate.
delete process.env.ORS_API_KEY;
