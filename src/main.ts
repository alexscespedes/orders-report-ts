import { fetchJson } from "./http";
import { parseOrder } from "./parseOrder";
import { buildReport } from "./report";
import type { Order, Rejected, Report } from "./types";

const BASE_URL = "http://localhost:3000";

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

async function run(path: string): Promise<Report | null> {
  let payload: unknown;
  try {
    payload = await fetchJson<unknown>(`${BASE_URL}${path}`);
  } catch (err) {
    console.error(`[${path}] fetch failed: ${errorMessage(err)}`);
    return null;
  }

  if (!Array.isArray(payload)) {
    console.error(
      `[${path}] expected an array of records, got ${typeof payload}`,
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

async function main(): Promise<void> {
  for (const path of ["/orders.json", "/missing"]) {
    console.log(`\n=== ${path} ===`);
    const report = await run(path);

    if (report === null) {
      console.log("No report produced.");
      continue;
    }
    console.dir(report, { depth: null });
  }
}

main().catch((err) => {
  console.error("Unexpected failure:", errorMessage(err));
  process.exitCode = 1;
});
