import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

export const SEED_FILE = fileURLToPath(
  new URL('../seed/seed.sql', import.meta.url),
);

export function applySeed(
  sqlite: Database.Database,
  file: string = SEED_FILE,
): void {
  sqlite.exec(readFileSync(file, 'utf8'));
}
