import test from "node:test";
import assert from "node:assert/strict";

import { createLogger } from "./logger";

test("createLogger emits structured JSON entries", () => {
  const lines: string[] = [];
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  console.log = (...args: unknown[]) => {
    lines.push(args.join(" "));
  };
  console.info = (...args: unknown[]) => {
    lines.push(args.join(" "));
  };
  console.warn = (...args: unknown[]) => {
    lines.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    lines.push(args.join(" "));
  };

  try {
    const logger = createLogger({ service: "web-test" });
    logger.info("hello", { userId: 7 });

    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]);

    assert.equal(parsed.level, "info");
    assert.equal(parsed.message, "hello");
    assert.deepEqual(parsed.context, { userId: 7 });
    assert.equal(parsed.service, "web-test");
    assert.match(parsed.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }
});
