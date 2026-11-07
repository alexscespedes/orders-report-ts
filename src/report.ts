import {
  type Order,
  type Report,
  type Rejected,
  type OrderStatus,
  ORDER_STATUSES,
} from "./types";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function buildReport(
  orders: Order[],
  rejected: Rejected[],
  topN = 5,
): Report {
  // 1. Revenue per status: start with every status at 0 so the Record is total.
  const zero: Record<OrderStatus, number> = {
    pending: 0,
    shipped: 0,
    cancelled: 0,
    refunded: 0,
  };
  const revenue = orders.reduce(
    (acc, o) => ({ ...acc, [o.status]: acc[o.status] + o.total }),
    zero,
  );

  const revenueByStatus: Record<OrderStatus, number> = {
    pending: round2(revenue.pending),
    shipped: round2(revenue.shipped),
    cancelled: round2(revenue.cancelled),
    refunded: round2(revenue.refunded),
  };

  // 2. Top SKUs by quantity: sum qty per SKU, then sort a copy and take N.
  const qtyBySku = orders
    .flatMap((o) => o.items)
    .reduce(
      (acc, item) => acc.set(item.sku, (acc.get(item.sku) ?? 0) + item.qty),
      new Map<string, number>(),
    );

  const topSkus = [...qtyBySku]
    .map(([sku, qty]) => ({ sku, qty }))
    .sort((a, b) => b.qty - a.qty || a.sku.localeCompare(b.sku))
    .slice(0, topN);

  // 3. Repeat customers: count orders per non-null customer, keep those with > 1.
  const orderByCustomer = orders
    .filter((o): o is Order & { customer: string } => o.customer !== null)
    .reduce(
      (acc, o) => acc.set(o.customer, (acc.get(o.customer) ?? 0) + 1),
      new Map<string, number>(),
    );

  const repeatCustomers = Object.entries(orderByCustomer)
    .filter(([, count]) => count > 1)
    .map(([customer, count]) => ({ customer, orders: count }))
    .sort(
      (a, b) => b.orders - a.orders || a.customer.localeCompare(b.customer),
    );

  return {
    revenueByStatus,
    topSkus,
    repeatCustomers,
    rejected: [...rejected],
  };
}
