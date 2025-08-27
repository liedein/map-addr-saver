import { type UsageTracking, type InsertUsageTracking } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUsageByIpAndDate(ipAddress: string, date: string): Promise<UsageTracking | undefined>;
  createUsageRecord(usage: InsertUsageTracking): Promise<UsageTracking>;
  updateUsageCount(id: string, count: number): Promise<UsageTracking>;
}

export class MemStorage implements IStorage {
  private usageRecords: Map<string, UsageTracking>;

  constructor() {
    this.usageRecords = new Map();
  }

  async getUsageByIpAndDate(ipAddress: string, date: string): Promise<UsageTracking | undefined> {
    return Array.from(this.usageRecords.values()).find(
      (record) => record.ipAddress === ipAddress && record.date === date,
    );
  }

  async createUsageRecord(insertUsage: InsertUsageTracking): Promise<UsageTracking> {
    const id = randomUUID();
    const now = new Date();
    const usage: UsageTracking = { 
      ...insertUsage, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.usageRecords.set(id, usage);
    return usage;
  }

  async updateUsageCount(id: string, count: number): Promise<UsageTracking> {
    const existing = this.usageRecords.get(id);
    if (!existing) {
      throw new Error("Usage record not found");
    }
    
    const updated: UsageTracking = {
      ...existing,
      usageCount: count,
      updatedAt: new Date()
    };
    this.usageRecords.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
