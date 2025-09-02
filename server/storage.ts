import { type UsageTracking, type InsertUsageTracking } from "@shared/schema";
import { randomUUID } from "crypto";

// Storage 인터페이스 (id와 date 기반 관리)
export interface IStorage {
  getUsageByIpAndDate(ipAddress: string, date: string): Promise<UsageTracking | undefined>;
  createUsageRecord(usage: InsertUsageTracking): Promise<UsageTracking>;
  updateUsageCount(ipAddress: string, date: string, count: number): Promise<UsageTracking>;
}

// 메모리 기반 Storage 구현
export class MemStorage implements IStorage {
  private usageRecords: Map<string, UsageTracking>;

  constructor() {
    this.usageRecords = new Map();
  }

  private getKey(ipAddress: string, date: string): string {
    return `${ipAddress}|${date}`;
  }

  async getUsageByIpAndDate(ipAddress: string, date: string): Promise<UsageTracking | undefined> {
    const key = this.getKey(ipAddress, date);
    return this.usageRecords.get(key);
  }

  async createUsageRecord(insertUsage: InsertUsageTracking): Promise<UsageTracking> {
    const id = randomUUID();
    const now = new Date();
    const usage: UsageTracking = {
      ...insertUsage,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const key = this.getKey(insertUsage.ipAddress, insertUsage.date);
    this.usageRecords.set(key, usage);
    return usage;
  }

  async updateUsageCount(ipAddress: string, date: string, count: number): Promise<UsageTracking> {
    const key = this.getKey(ipAddress, date);
    const existing = this.usageRecords.get(key);

    if (!existing) {
      throw new Error("Usage record not found");
    }

    const updated: UsageTracking = {
      ...existing,
      usageCount: count,
      updatedAt: new Date(),
    };
    this.usageRecords.set(key, updated);
    return updated;
  }
}

export const storage = new MemStorage();
