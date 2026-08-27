import { getDb } from "./store";
import type { ContractEvent, GroupRecord, ContributionRecord, PayoutRecord, MemberRecord } from "./types";
import crypto from "crypto";

export interface IndexerConfig {
  eventsFilePath: string;
}

export async function indexEvents(config: IndexerConfig): Promise<{ processed: number; skipped: number }> {
  const db = getDb();
  const fs = await import("fs");

  if (!fs.existsSync(config.eventsFilePath)) {
    console.error(`Events file not found: ${config.eventsFilePath}`);
    return { processed: 0, skipped: 0 };
  }

  const raw = fs.readFileSync(config.eventsFilePath, "utf-8");
  const events: ContractEvent[] = JSON.parse(raw);

  let processed = 0;
  let skipped = 0;

  const insertEvent = db.prepare(
    `INSERT OR IGNORE INTO events (id, ledger, timestamp, contract_id, event_type, topics, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const upsertGroup = db.prepare(
    `INSERT OR REPLACE INTO groups (group_id, name, admin, is_public, total_members, status, created_at, contract_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMember = db.prepare(
    `INSERT OR IGNORE INTO members (id, group_id, address, join_order, status, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertContribution = db.prepare(
    `INSERT OR IGNORE INTO contributions (id, group_id, member, amount, round, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertPayout = db.prepare(
    `INSERT OR IGNORE INTO payouts (id, group_id, recipient, amount, round, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const indexTransaction = db.transaction(() => {
    for (const event of events) {
      // Idempotent: skip if already processed (by ledger + event_type)
      const existing = db.prepare(
        `SELECT id FROM events WHERE ledger = ? AND event_type = ? AND contract_id = ?`
      ).get(event.ledger, event.event_type, event.contract_id);

      if (existing) {
        skipped++;
        continue;
      }

      const eventId = event.id || crypto.randomUUID();

      insertEvent.run(
        eventId,
        event.ledger,
        event.timestamp,
        event.contract_id,
        event.event_type,
        JSON.stringify(event.topics),
        event.data
      );

      // Process event by type
      switch (event.event_type) {
        case "created": {
          const data = JSON.parse(event.data);
          upsertGroup.run(
            data.group_id || event.topics[1],
            data.name || "",
            data.admin || "",
            data.is_public ? 1 : 0,
            data.total_members || 0,
            "Open",
            event.timestamp,
            event.contract_id
          );
          break;
        }
        case "joined": {
          const data = JSON.parse(event.data);
          const groupId = event.topics[1];
          const memberId = `${groupId}-${data.address}`;
          insertMember.run(
            memberId,
            groupId,
            data.address || "",
            data.join_order || 0,
            "Active",
            event.timestamp
          );
          break;
        }
        case "contributed": {
          const data = JSON.parse(event.data);
          const groupId = event.topics[1];
          const contribId = `${groupId}-${data.member}-${data.round}`;
          insertContribution.run(
            contribId,
            groupId,
            data.member || "",
            data.amount || 0,
            data.round || 0,
            event.timestamp
          );
          break;
        }
        case "paid": {
          const data = JSON.parse(event.data);
          const groupId = event.topics[1];
          const payoutId = `${groupId}-${data.recipient}-${data.round}`;
          insertPayout.run(
            payoutId,
            groupId,
            data.recipient || "",
            data.amount || 0,
            data.round || 0,
            event.timestamp
          );
          break;
        }
      }

      processed++;
    }
  });

  indexTransaction();

  return { processed, skipped };
}
