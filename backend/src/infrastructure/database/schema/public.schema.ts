import { boolean, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const publicSchema = pgSchema('public');

export const tenants = publicSchema.table('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
});
