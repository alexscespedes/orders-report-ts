import { isRecord } from "./guards";
import { ORDER_STATUSES } from "./types";
import type { OrderItem, ParseResult } from "./types";

// Coerces finite numbers and numeric strings; everything else becomes NaN.

const DECIMAL = /^-?\d+(\.\d+)?$/;
function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && DECIMAL.test(v.trim())) return Number(v);
  return NaN;
}

const reject = (reason: string): ParseResult => ({ kind: "rejected", reason });

export function parseOrder(raw: unknown): ParseResult {
  // Policy: a non-object can't be salvaged, so reject.
  if (!isRecord(raw)) return reject("record is not an object");

  // Policy: numeric strings like "2" are coerced, (legacy API stringify ids); "abc" or "" is rejected.
  const id = toNumber(raw.id);
  if (!Number.isInteger(id) || id <= 0) {
    return reject(`invalid id: ${JSON.stringify(raw.id)}`);
  }

  // Policy: a MISSING customer key means a corrupt/incomplete record, so reject.
  if (!("customer" in raw) || raw.customer === undefined) {
    return reject("customer field is missing");
  }

  // Policy: an explicit null customer is a legitimate guest checkout, so keep it as null.
  // Policy: a non-string, non-null customer (e.g. 123) is ambiguous, so reject.
  const rawCustomer = raw.customer;
  if (rawCustomer !== null && typeof rawCustomer !== "string") {
    return reject(`invalid customer: ${JSON.stringify(rawCustomer)}`);
  }

  // Policy: blank/whitespace customer strings are treated as no customer (null).
  const customer =
    rawCustomer === null || rawCustomer.trim() === ""
      ? null
      : rawCustomer.trim();

  // Policy: status casing/whitespace is normalized ("PAID " -> "paid"), it's harmless client variation.
  const statusNorm =
    typeof raw.status === "string"
      ? raw.status.trim().toLowerCase()
      : raw.status;

  // Policy: an unknown status is rejected, not defaulted, since guessing could ship or refund the wrong order.
  const status = ORDER_STATUSES.find((s) => s === statusNorm);
  if (status === undefined) {
    return reject(`unknown status: ${JSON.stringify(raw.status)}`);
  }

  // Policy: numeric-string totals ("19.99") are coerced; NaN, Infinity, and negatives are rejected as untrustworthy money values.
  const total = toNumber(raw.total);
  if (!Number.isFinite(total) || total < 0) {
    return reject(`invalid total: ${JSON.stringify(raw.total)}`);
  }

  // Policy: items must be an array; a missing/non-array value is rejected rather than defaulted to [].
  const rawItems: unknown = raw.items;
  if (!Array.isArray(rawItems)) return reject("items is not an array");

  const items: OrderItem[] = [];
  // Policy: one bad line item rejects the whole order; silently dropping items would corrupt it.
  for (const [i, it] of rawItems.entries()) {
    if (!isRecord(it)) return reject(`items[${i}] is not an object`);

    const sku = it.sku;
    if (typeof sku !== "string" || sku.trim() === "") {
      return reject(`items[${i}].sku invalid`);
    }

    const qty = toNumber(it.qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      return reject(`items[${i}].qty invalid: ${JSON.stringify(it.qty)}`);
    }

    const price = toNumber(it.price);
    if (!Number.isFinite(price) || price < 0) {
      return reject(`items[${i}].price invalid: ${JSON.stringify(it.price)}`);
    }

    items.push({ sku: sku.trim(), qty, price });
  }

  // Policy: missing/null createdAt becomes null (the type allows it and "unknown time" is a valid state).
  // Policy: a PRESENT but unparseable date is rejected, since it signals corruption and silently nulling it would hide that.

  let createdAt: Date | null = null;
  if (raw.createdAt !== undefined && raw.createdAt !== null) {
    const d =
      typeof raw.createdAt === "string"
        ? new Date(raw.createdAt)
        : new Date(NaN);
    if (Number.isNaN(d.getTime())) {
      return reject(`bad createdAt: ${JSON.stringify(raw.createdAt)}`);
    }
    createdAt = d;
  }

  return {
    kind: "ok",
    value: { id, customer, status, total, items, createdAt },
  };
}
