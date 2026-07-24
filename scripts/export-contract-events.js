#!/usr/bin/env node

/**
 * Script to query Stellar Horizon / Soroban RPC for all contract events
 * since the last run and append them to a local JSONL archive.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const DEFAULT_OUTPUT = path.join(LOGS_DIR, 'contract-events.jsonl');
const DEFAULT_CHECKPOINT = path.join(LOGS_DIR, '.event_checkpoint.json');
const DEPLOYMENT_INFO = path.join(ROOT_DIR, 'deployment-info.json');
const ENV_FILE = path.join(ROOT_DIR, 'apps', 'web', '.env.local');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    output: DEFAULT_OUTPUT,
    checkpoint: DEFAULT_CHECKPOINT,
    rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    horizonUrl: process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
    contractIds: []
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      options.output = path.resolve(process.cwd(), args[++i]);
    } else if (args[i] === '--checkpoint' && args[i + 1]) {
      options.checkpoint = path.resolve(process.cwd(), args[++i]);
    } else if (args[i] === '--rpc-url' && args[i + 1]) {
      options.rpcUrl = args[++i];
    } else if (args[i] === '--horizon-url' && args[i + 1]) {
      options.horizonUrl = args[++i];
    } else if (args[i] === '--contract-id' && args[i + 1]) {
      options.contractIds.push(args[++i]);
    }
  }

  // Load contract IDs from files if not specified via CLI
  if (options.contractIds.length === 0) {
    if (fs.existsSync(DEPLOYMENT_INFO)) {
      try {
        const info = JSON.parse(fs.readFileSync(DEPLOYMENT_INFO, 'utf8'));
        if (info.registry_contract_id) options.contractIds.push(info.registry_contract_id);
        if (info.savings_contract_id) options.contractIds.push(info.savings_contract_id);
      } catch (err) {
        // ignore parse error
      }
    }
  }

  if (options.contractIds.length === 0 && fs.existsSync(ENV_FILE)) {
    try {
      const content = fs.readFileSync(ENV_FILE, 'utf8');
      const regMatch = content.match(/^NEXT_PUBLIC_REGISTRY_CONTRACT_ID=(.*)$/m);
      const savMatch = content.match(/^NEXT_PUBLIC_SAVINGS_CONTRACT_ID=(.*)$/m);
      const mainMatch = content.match(/^NEXT_PUBLIC_CONTRACT_ID=(.*)$/m);

      if (regMatch && regMatch[1]) options.contractIds.push(regMatch[1].trim());
      if (savMatch && savMatch[1]) options.contractIds.push(savMatch[1].trim());
      if (options.contractIds.length === 0 && mainMatch && mainMatch[1]) {
        options.contractIds.push(mainMatch[1].trim());
      }
    } catch (err) {
      // ignore
    }
  }

  // Filter out duplicates
  options.contractIds = [...new Set(options.contractIds.filter(Boolean))];
  return options;
}

// Make HTTP/HTTPS request
function postJson(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const body = JSON.stringify(data);

    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (e) {
          resolve({ error: 'Failed to parse JSON response', raw: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

function getJson(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(url, { method: 'GET' }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (e) {
          resolve({ error: 'Failed to parse JSON response', raw: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function main() {
  const options = parseArgs();
  console.log('==================================================');
  console.log('📦 EsuStellar Contract Event Archiver');
  console.log('==================================================');
  console.log(`RPC URL:      ${options.rpcUrl}`);
  console.log(`Horizon URL:  ${options.horizonUrl}`);
  console.log(`Output File:  ${options.output}`);
  console.log(`Checkpoint:   ${options.checkpoint}`);
  console.log(`Contract IDs: ${options.contractIds.join(', ') || 'None found'}`);
  console.log('==================================================');

  // Ensure logs directory exists
  const outDir = path.dirname(options.output);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Load checkpoint state
  let lastLedger = 0;
  let cursor = null;
  if (fs.existsSync(options.checkpoint)) {
    try {
      const state = JSON.parse(fs.readFileSync(options.checkpoint, 'utf8'));
      lastLedger = state.last_ledger || 0;
      cursor = state.cursor || null;
      console.log(`Loaded checkpoint: last_ledger=${lastLedger}, cursor=${cursor}`);
    } catch (err) {
      console.log('Warning: Could not parse existing checkpoint, starting fresh.');
    }
  } else {
    console.log('No checkpoint found. Starting initial event export.');
  }

  let totalExported = 0;
  let maxLedgerSeen = lastLedger;

  // Query events using Soroban RPC getEvents method
  try {
    const rpcPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getEvents',
      params: {
        startLedger: lastLedger > 0 ? lastLedger : 1,
        pagination: { limit: 100 }
      }
    };

    if (options.contractIds.length > 0) {
      rpcPayload.params.filters = [
        {
          type: 'contract',
          contractIds: options.contractIds
        }
      ];
    }

    console.log(`Querying Soroban RPC events starting from ledger ${rpcPayload.params.startLedger}...`);
    const rpcRes = await postJson(options.rpcUrl, rpcPayload);

    let events = [];
    if (rpcRes && rpcRes.result && Array.isArray(rpcRes.result.events)) {
      events = rpcRes.result.events;
      maxLedgerSeen = rpcRes.result.latestLedger ? parseInt(rpcRes.result.latestLedger, 10) : maxLedgerSeen;
    }

    // Fallback query to Horizon operations if Soroban RPC yielded no events or was unavailable
    if (events.length === 0 && options.contractIds.length > 0) {
      console.log('Checking Horizon API operations fallback...');
      for (const contractId of options.contractIds) {
        const horizonUrl = `${options.horizonUrl}/accounts/${contractId}/operations?order=asc&limit=100${cursor ? '&cursor=' + cursor : ''}`;
        try {
          const res = await getJson(horizonUrl);
          if (res && res._embedded && Array.isArray(res._embedded.records)) {
            for (const rec of res._embedded.records) {
              events.push({
                id: rec.id,
                type: 'horizon_operation',
                contractId,
                operationType: rec.type,
                created_at: rec.created_at,
                txHash: rec.transaction_hash,
                raw: rec
              });
              cursor = rec.paging_token;
            }
          }
        } catch (e) {
          // ignore horizon fallback error
        }
      }
    }

    const writeStream = fs.createWriteStream(options.output, { flags: 'a' });
    const nowIso = new Date().toISOString();

    for (const event of events) {
      const eventLedger = event.ledger ? parseInt(event.ledger, 10) : 0;
      if (eventLedger > maxLedgerSeen) {
        maxLedgerSeen = eventLedger;
      }

      const archiveRecord = {
        archivedAt: nowIso,
        contractId: event.contractId || (event.contractId ? event.contractId : null),
        id: event.id,
        type: event.type || 'contract_event',
        ledger: event.ledger || null,
        ledgerClosedAt: event.ledgerClosedAt || null,
        topic: event.topic || null,
        value: event.value || null,
        inSuccessfulContractCall: event.inSuccessfulContractCall ?? true,
        raw: event
      };

      writeStream.write(JSON.stringify(archiveRecord) + '\n');
      totalExported++;
    }

    writeStream.end();

    // Save updated checkpoint
    const newCheckpoint = {
      last_ledger: maxLedgerSeen,
      cursor: cursor,
      updated_at: nowIso,
      total_events_archived_last_run: totalExported
    };
    fs.writeFileSync(options.checkpoint, JSON.stringify(newCheckpoint, null, 2));

    console.log(`✅ Event export complete!`);
    console.log(`   - Archived ${totalExported} events to ${options.output}`);
    console.log(`   - Checkpoint updated: last_ledger=${maxLedgerSeen}`);
  } catch (err) {
    console.error('❌ Error exporting contract events:', err.message);
    process.exit(1);
  }
}

main();
