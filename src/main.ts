import { fetchJson } from "./http";
import { parseOrder } from "./parseOrder";
import { buildReport } from "./report";
import {
  HttpError,
  InvalidJsonError,
  NetworkError,
  TimeoutError,
} from "./types";
import type { Order, Rejected, Report } from "./types";

const BASE_URL = "http://localhost:3000";
const TIMEOUT_MS = 500;

function describeError(err: unknown): string {
  if (err instanceof TimeoutError) return `TIMEOUT after ${err.timeoutMs}ms`;
  if (err instanceof HttpError) return `HTTP ERROR ${err.status}`;
  if (err instanceof InvalidJsonError) return "INVALID JSON";
  if (err instanceof NetworkError) return "NETWORK FAILURE";
  return `UNEXPECTED: ${err instanceof Error ? err.message : String(err)}`;
}

async function run(url: string): Promise<Report | null> {
  let payload: unknown;
  try {
    payload = await fetchJson(url, TIMEOUT_MS);
  } catch (err) {
    console.error(`[${url}] ${describeError(err)}`);
    return null;
  }

  if (!Array.isArray(payload)) {
    console.error(
      `[${url}] expected an array of records, got ${typeof payload}`,
    );
    return null;
  }

  const parsed = payload.map((raw) => ({ raw, result: parseOrder(raw) }));

  const orders: Order[] = parsed.flatMap(({ result }) =>
    result.kind === "ok" ? [result.value] : [],
  );

  const rejected: Rejected[] = parsed.flatMap(({ raw, result }) =>
    result.kind === "rejected" ? [{ raw, reason: result.reason }] : [],
  );

  return buildReport(orders, rejected);
}

const TARGETS = [
  `${BASE_URL}/orders.json`,
  `${BASE_URL}/missing`,
  `${BASE_URL}/error-500`,
  `${BASE_URL}/bad-json`,
  `${BASE_URL}/slow`,
  "http://localhost:1/orders.json",
];

async function main(): Promise<void> {
  for (const url of TARGETS) {
    console.log(`\n=== ${url} ===`);
    const report = await run(url);
    if (report === null) {
      console.log("No report produced.");
      continue;
    }
    console.dir(report, { depth: null });
  }
}

main().catch((err) => {
  console.error(
    "Unexpected failure:",
    err instanceof Error ? err.message : String(err),
  );
  process.exitCode = 1;
});
