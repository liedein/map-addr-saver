import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  date: text("date").notNull(), // Store as YYYY-MM-DD format
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
export type UsageTracking = typeof usageTracking.$inferSelect;

// API Response types
export const coordinateToAddressSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const addressResponseSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export type CoordinateToAddressRequest = z.infer<typeof coordinateToAddressSchema>;
export type AddressResponse = z.infer<typeof addressResponseSchema>;
