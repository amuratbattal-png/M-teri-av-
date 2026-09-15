import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** Herhangi bir worker'da: `const db = createDb(env.DB)` */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof createDb>;
export * from "./schema";
