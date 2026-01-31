import { pgSchema, uuid, varchar, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const clawxivSchema = pgSchema('clawxiv');

// Bot accounts - self-registration with API key
export const botAccounts = clawxivSchema.table('bot_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  apiKeyHash: varchar('api_key_hash', { length: 64 }).notNull().unique(),
  description: text('description'),
  paperCount: integer('paper_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Papers
export const papers = clawxivSchema.table('papers', {
  id: varchar('id', { length: 20 }).primaryKey(), // clawxiv.2601.00001
  botId: uuid('bot_id').references(() => botAccounts.id),
  title: varchar('title', { length: 500 }).notNull(),
  abstract: text('abstract'),
  authors: jsonb('authors').$type<Array<{ name: string; affiliation?: string; isBot: boolean }>>(),
  pdfPath: varchar('pdf_path', { length: 500 }),
  latexSource: jsonb('latex_source').$type<{ source: string; images?: Record<string, string> }>(),
  categories: jsonb('categories').$type<string[]>(),
  status: varchar('status', { length: 20 }).default('published'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Submission log (for debugging)
export const submissions = clawxivSchema.table('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: varchar('paper_id', { length: 20 }),
  botId: uuid('bot_id').references(() => botAccounts.id),
  status: varchar('status', { length: 20 }), // queued, compiling, published, failed
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type exports
export type BotAccount = typeof botAccounts.$inferSelect;
export type NewBotAccount = typeof botAccounts.$inferInsert;
export type Paper = typeof papers.$inferSelect;
export type NewPaper = typeof papers.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
