// schema.ts
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 사용량 추적 테이블 스키마 정의
export const usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey(), // 기본키로 사용되는 ID
  ipAddress: text("ip_address").notNull(), // IP 주소 (필수)
  usageCount: integer("usage_count").notNull().default(0), // 사용 횟수 (기본값 0)
  date: text("date").notNull(), // 날짜 (YYYY-MM-DD 형식으로 저장)
  createdAt: timestamp("created_at").defaultNow(), // 생성일시 (기본값 현재 시각)
  updatedAt: timestamp("updated_at").defaultNow(), // 수정일시 (기본값 현재 시각)
});

// insert 시 필요한 유효성 검사 스키마 (id, createdAt, updatedAt 제외)
export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// insert용 타입 정의
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
// 조회용 타입 정의
export type UsageTracking = typeof usageTracking.$inferSelect;

// API 요청 및 응답 타입 정의

// 좌표를 주소로 변환하는 요청 스키마
export const coordinateToAddressSchema = z.object({
  lat: z.number(), // 위도
  lng: z.number(), // 경도
});

// 주소 변환 응답 스키마
export const addressResponseSchema = z.object({
  address: z.string(), // 변환된 주소
  lat: z.number(),     // 위도
  lng: z.number(),     // 경도
});

// 타입 추론: 좌표 -> 주소 요청 타입
export type CoordinateToAddressRequest = z.infer<typeof coordinateToAddressSchema>;
// 타입 추론: 주소 변환 응답 타입
export type AddressResponse = z.infer<typeof addressResponseSchema>;
