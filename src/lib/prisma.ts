// ✅ In dev, the @prisma/client module is loaded once into the Node process
// require cache and isn't reloaded when `prisma generate` runs. We delete the
// cache entry for the generated client so the next `new PrismaClient()` call
// reads the freshly-generated schema from disk.
function bustPrismaCache() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const paths = Object.keys(require.cache).filter(
        (p) => p.includes('.prisma/client') || p.includes('@prisma/client'),
      );
      paths.forEach((p) => {
        delete (require.cache as any)[p];
      });
    } catch {
      /* ignore */
    }
  }
}

bustPrismaCache();

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');

// Bump this whenever the Prisma schema is changed and the client is
// regenerated. The dev server keeps the PrismaClient instance in a global
// singleton to avoid connection sprawl during HMR, but that singleton
// doesn't pick up newly-generated types — bumping the signature forces it
// to be recreated after a `prisma generate`.
const PRISMA_CACHE_SIGNATURE = 'v3.2-trackId-2025-01';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  __prismaSig?: string;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

let prisma: PrismaClient;
if (
  globalForPrisma.prisma &&
  globalForPrisma.__prismaSig === PRISMA_CACHE_SIGNATURE
) {
  prisma = globalForPrisma.prisma;
} else {
  prisma = createPrismaClient();
  globalForPrisma.prisma = prisma;
  globalForPrisma.__prismaSig = PRISMA_CACHE_SIGNATURE;
}

export { prisma };


