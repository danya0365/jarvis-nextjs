/**
 * MockUsageLedgerRepository
 * Mock implementation for development, testing, and SSR
 * Following Clean Architecture - this is in the Infrastructure layer
 */

import {
  IUsageLedgerRepository,
  UsageLedgerEntry,
  CreateUsageLedgerEntryData,
} from "@/src/application/repositories/IUsageLedgerRepository";

export class MockUsageLedgerRepository implements IUsageLedgerRepository {
  private entries: UsageLedgerEntry[] = [];

  async getAll(): Promise<UsageLedgerEntry[]> {
    return [...this.entries];
  }

  async append(data: CreateUsageLedgerEntryData): Promise<UsageLedgerEntry> {
    const newEntry: UsageLedgerEntry = {
      id: `usage-${this.entries.length + 1}`,
      ...data,
    };
    this.entries.push(newEntry);
    return newEntry;
  }

  async clear(): Promise<void> {
    this.entries = [];
  }
}
