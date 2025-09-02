import { randomUUID } from "crypto";

type UsageRecord = {
  id: string;
  ipAddress: string;
  usageCount: number;
  date: string; // YYYY-MM-DD 형식 날짜
  createdAt: Date;
  updatedAt: Date;
};

class MemStorage {
  private usageRecords: Map<string, UsageRecord>;

  constructor() {
    this.usageRecords = new Map();
  }

  // IP와 날짜로 사용량 조회
  async getUsageByIpAndDate(ipAddress: string, date: string): Promise<UsageRecord | undefined> {
    return Array.from(this.usageRecords.values()).find(
      (record) => record.ipAddress === ipAddress && record.date === date
    );
  }

  // 새로운 사용량 기록 생성
  async createUsageRecord(insertUsage: Omit<UsageRecord, "id" | "createdAt" | "updatedAt">): Promise<UsageRecord> {
    const id = randomUUID();
    const now = new Date();
    const usage: UsageRecord = {
      ...insertUsage,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.usageRecords.set(id, usage);
    return usage;
  }

  // 사용량 업데이트
  async updateUsageCount(id: string, count: number): Promise<UsageRecord> {
    const existing = this.usageRecords.get(id);
    if (!existing) {
      throw new Error("Usage record not found");
    }
    const updated: UsageRecord = {
      ...existing,
      usageCount: count,
      updatedAt: new Date(),
    };
    this.usageRecords.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
