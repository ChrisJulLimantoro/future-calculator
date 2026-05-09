import { pgTable, text, uuid, timestamp, real, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  limitEntryFeeRate: real('limit_entry_fee_rate').notNull().default(0.0002),
  marketEntryFeeRate: real('market_entry_fee_rate').notNull().default(0.0005),
  limitExitFeeRate: real('limit_exit_fee_rate').notNull().default(0.0002),
  marketExitFeeRate: real('market_exit_fee_rate').notNull().default(0.0005),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  entryOrderType: varchar('entry_order_type', { length: 10 }), // 'limit' | 'market'
  entryFeeRate: real('entry_fee_rate'),
  entryFee: real('entry_fee'),
  openedAt: timestamp('opened_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
  closePrice: real('close_price'),
  exitOrderType: varchar('exit_order_type', { length: 10 }), // 'limit' | 'market'
  exitFeeRate: real('exit_fee_rate'),
  exitFee: real('exit_fee'),
  totalFees: real('total_fees'),
  realizedPnl: real('realized_pnl'),
});

export type UserRow = typeof users.$inferSelect;
export type UserSettingsRow = typeof userSettings.$inferSelect;
export type PositionRow = typeof positions.$inferSelect;
