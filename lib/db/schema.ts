import { pgTable, text, uuid, timestamp, real, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const positions = pgTable('positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  side: varchar('side', { length: 10 }).notNull(), // 'long' | 'short'
  entryPrice: real('entry_price').notNull(),
  size: real('size').notNull(),
  leverage: real('leverage').notNull(),
  openedAt: timestamp('opened_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
  closePrice: real('close_price'),
  realizedPnl: real('realized_pnl'),
});

export type UserRow = typeof users.$inferSelect;
export type PositionRow = typeof positions.$inferSelect;
