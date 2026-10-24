import { OrderItem, OrderStatus, ParseResult } from "./types";

const STATUSES: readonly OrderStatus[] = [
  "pending",
  "shipped",
  "cancelled",
  "refunded",
];

// Coerces finite numbers and numeric strings; everything else becomes NaN.

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return NaN;
}

export function parseOrder(raw: unknown): ParseResult {
  // Policy: a non-object can't be salvaged, so reject.
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { kind: "rejected", reason: "record is not an object" };
  }
  const r = raw as Record<string, unknown>;

  // Policy: numeric strings like "42" are coerced, since upstream CSV exports stringify ids; "abc" or "" is rejected.
  const id = toNumber(r.id);
  if (!Number.isInteger(id) || id <= 0) {
    return { kind: "rejected", reason: `invalid id: ${JSON.stringify(r.id)}` };
  }

  // Policy: a MISSING customer key means a corrupt/incomplete record, so reject.
  if (!("customer" in r) || r.customer === undefined) {
    return { kind: "rejected", reason: "customer field is missing" };
  }

  // Policy: an explicit null customer is a legitimate guest checkout, so keep it as null.
  // Policy: a non-string, non-null customer (e.g. 123) is ambiguous, so reject.
  if (r.customer !== null && typeof r.customer !== "string") {
    return {
      kind: "rejected",
      reason: `invalid customer: ${JSON.stringify(r.customer)}`,
    };
  }

  // Policy: blank/whitespace customer strings are treated as no customer (null) after trimming.

  const customer =
    r.customer === null || r.customer.trim() === "" ? null : r.customer.trim();

  // Policy: status casing/whitespace is normalized ("PAID " -> "paid"), it's harmless client variation.

  const statusNorm =
    typeof r.status === "string" ? r.status.trim().toLowerCase() : r.status;

  // Policy: an unknown status is rejected, not defaulted, since guessing could ship or refund the wrong order.

  const status = STATUSES.find((s) => s === statusNorm);
  if (!status) {
    return {
      kind: "rejected",
      reason: `unknown status: ${JSON.stringify(r.status)}`,
    };
  }

  // Policy: numeric-string totals ("19.99") are coerced; NaN, Infinity, and negatives are rejected as untrustworthy money values.

  const total = toNumber(r.total);
  if (!Number.isFinite(total) || total < 0) {
    return {
      kind: "rejected",
      reason: `invalid total: ${JSON.stringify(r.total)}`,
    };
  }

  // Policy: items must be an array; a missing/non-array value is rejected rather than defaulted to [].

  if (!Array.isArray(r.items)) {
    return { kind: "rejected", reason: "items is not an array" };
  }

  const items: OrderItem[] = [];
  for (const [i, it] of r.items.entries()) {
    // Policy: one bad line item rejects the whole order, since silently dropping items would corrupt the order.
    if (typeof it !== "object" || it === null) {
      return { kind: "rejected", reason: `items[${i}] is not an object` };
    }
    const item = it as Record<string, unknown>;
    const qty = toNumber(item.qty);
    const price = toNumber(item.price);
    if (typeof item.sku !== "string" || item.sku.trim() === "") {
      return { kind: "rejected", reason: `items[${i}].sku invalid` };
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return {
        kind: "rejected",
        reason: `items[${i}].qty invalid: ${JSON.stringify(item.qty)}`,
      };
    }
    if (!Number.isFinite(price) || price < 0) {
      return {
        kind: "rejected",
        reason: `items[${i}].price invalid: ${JSON.stringify(item.price)}`,
      };
    }
    items.push({ sku: item.sku.trim(), qty, price });
  }

  // Policy: missing/null createdAt becomes null (the type allows it and "unknown time" is a valid state).
  // Policy: a PRESENT but unparseable date is rejected, since it signals corruption and silently nulling it would hide that.

  let createdAt: Date | null = null;
  if (r.createdAt !== undefined && r.createdAt !== null) {
    const d =
      typeof r.createdAt === "string" ? new Date(r.createdAt) : new Date(NaN);
    if (Number.isNaN(d.getTime())) {
      return {
        kind: "rejected",
        reason: `bad createdAt: ${JSON.stringify(r.createdAt)}`,
      };
    }
    createdAt = d;
  }

  return {
    kind: "ok",
    value: { id, customer, status, total, items, createdAt },
  };
}
