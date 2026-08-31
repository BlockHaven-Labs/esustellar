export { indexEvents } from "./indexer";
export { getDb, closeDb } from "./store";
export type { ContractEvent, GroupRecord, MemberRecord, ContributionRecord, PayoutRecord } from "./types";

import { indexEvents } from "./indexer";
import { closeDb } from "./store";
import path from "path";

const EVENTS_FILE = process.env.EVENTS_FILE || path.join(process.cwd(), "data", "contract-events.json");

async function main() {
  console.log("EsuStellar Event Indexer");
  console.log("========================");
  console.log(`Events file: ${EVENTS_FILE}`);
  console.log("");

  try {
    const result = await indexEvents({ eventsFilePath: EVENTS_FILE });
    console.log(`Indexing complete:`);
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Skipped (already indexed): ${result.skipped}`);
  } catch (err) {
    console.error("Indexing failed:", err);
    process.exit(1);
  } finally {
    closeDb();
  }
}

main();
