import type { Config } from 'drizzle-kit';
import path from 'path';

const dataDir = process.env.DATA_DIR ?? './data';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(dataDir, 'healthbinder.db'),
  },
} satisfies Config;
