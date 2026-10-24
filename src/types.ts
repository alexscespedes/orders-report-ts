export type ParseResult =
  | { kind: "ok"; value: Order }
  | { kind: "rejected"; reason: string };

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
  qty: number | string;
  price: number;
}

export type OrderStatus = "pending" | "shipped" | "cancelled" | "refunded";

export interface Order {
  id: number;
  customer: string | null;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  createdAt: Date | null;
}

export type Rejected = { raw: unknown; reason: string };

export type Report = {
  revenueByStatus: Record<OrderStatus, number>;
  topSkus: { sku: string; qty: number }[];
  repeatCustomers: { customer: string; orders: number }[];
  rejected: { reason: string; raw: unknown }[];
};
