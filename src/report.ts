import { count } from "node:console";
import { Order, Report, Rejected, OrderStatus } from "./types";

const STATUSES: readonly OrderStatus[] = [
  "pending",
  "shipped",
  "cancelled",
  "refunded",
];

export function buildReport(
  orders: Order[],
  rejected: Rejected[],
  topN = 5,
): Report {
  // 1. Revenue per status: start with every status at 0 so the Record is total.
  const revenueByStatus = orders.reduce<Record<OrderStatus, number>>(
    (acc, o) => ({ ...acc, [o.status]: acc[o.status] + o.total }),
    STATUSES.reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<OrderStatus, number>,
    ),
  );

  // 2. Top SKUs by quantity: sum qty per SKU, then sort a copy and take N.
  const qtyBySku = orders
    .flatMap((o) => o.items)
    .reduce<Record<string, number>>((acc, item) => {
      const qty = Number(item.qty);
      return Number.isFinite(qty)
        ? { ...acc, [item.sku]: (acc[item.sku] ?? 0) + qty }
        : acc;
    }, {});

  const topSkus = Object.entries(qtyBySku)
    .map(([sku, qty]) => ({ sku, qty }))
    .sort((a, b) => b.qty - a.qty || a.sku.localeCompare(b.sku))
    .slice(0, topN);

  // 3. Repeat customers: count orders per non-null customer, keep those with > 1.
  const orderByCustomer = orders
    .filter((o): o is Order & { customer: string } => o.customer !== null)
    .reduce<
      Record<string, number>
    >((acc, o) => ({ ...acc, [o.customer]: (acc[o.customer] ?? 0) + 1 }), {});

  const repeatCustomers = Object.entries(orderByCustomer)
    .filter(([, count]) => count > 1)
    .map(([customer, count]) => ({ customer, orders: count }))
    .sort(
      (a, b) => b.orders - a.orders || a.customer.localeCompare(b.customer),
    );

  const rejectedList = rejected.map(({ reason, raw }) => ({ reason, raw }));

  return {
    revenueByStatus,
    topSkus,
    repeatCustomers,
    rejected: rejectedList,
  };
}
