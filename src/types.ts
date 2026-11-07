export const ORDER_STATUSES = [
  "pending",
  "shipped",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface RawOrderItem {
  sku?: string;
  qty?: number | string;
  price?: number | string;
}

export interface OrderRaw {
  id: number | string;
  customer: string | null;
  status: string;
  total: string | number;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  sku: string;
  qty: number;
  price: number;
}

export interface Order {
  id: number;
  customer: string | null;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  createdAt: Date | null;
}

export type ParseResult =
  | { kind: "ok"; value: Order }
  | { kind: "rejected"; reason: string };

export type Rejected = { raw: unknown; reason: string };

export type Report = {
  revenueByStatus: Record<OrderStatus, number>;
  topSkus: { sku: string; qty: number }[];
  repeatCustomers: { customer: string; orders: number }[];
  rejected: Rejected[];
};

export class FetchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
export class NetworkError extends FetchError {}
export class TimeoutError extends FetchError {
  constructor(
    public readonly timeoutMs: number,
    options?: ErrorOptions,
  ) {
    super(`Request timed out after ${timeoutMs}ms`, options);
  }
}
export class HttpError extends FetchError {
  constructor(
    public readonly status: number,
    statusText: string,
  ) {
    super(`HTTP ${status} ${statusText}`.trim());
  }
}
export class InvalidJsonError extends FetchError {}
