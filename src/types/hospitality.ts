export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING";
export type RoomType = "STANDARD" | "VIP";
export type ItemCategory = "BEER" | "LIQUOR" | "SOFT_DRINK" | "FOOD";
export type ProductionStation = "BAR" | "KITCHEN_MUCOMA";
export type OrderType = "TABLE" | "ROOM";
export type OrderStatus = "OPEN" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "CARD" | "ROOM_FOLIO" | "OTHER";

export interface RoomSummary {
  id: string;
  number: string;
  name: string;
  type: RoomType;
  hourlyRate: number;
  dailyRate: number;
  minimumHours: number;
  capacity: number;
  status: RoomStatus;
  amenities: string;
  notes: string | null;
  activeBooking: {
    bookingCode: string;
    guestName: string;
    guestPhone: string;
    rentalType: "HOURLY" | "DAILY";
    checkedInAt: string;
    expectedCheckoutAt: string;
    settlementStatus: "PENDING" | "PARTIALLY_PAID" | "PAID" | "REFUNDED";
  } | null;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  productionStation: ProductionStation;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  active: boolean;
  updatedAt: string;
}

export interface PosItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  productionStation: ProductionStation;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
}

export interface PosTable {
  id: string;
  name: string;
  section: "BAR_COUNTER" | "GARDEN" | "VIP_LOUNGE";
  capacity: number;
}

export interface PosBooking {
  id: string;
  bookingCode: string;
  guestName: string;
  roomNumber: string;
  settlementStatus: "PENDING" | "PARTIALLY_PAID" | "PAID" | "REFUNDED";
}

export interface PosOrderItem {
  id: string;
  itemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  roundNumber: number;
  station: ProductionStation;
  dispatchedAt: string | null;
  notes: string | null;
}

export interface PosOrderRound {
  id: string;
  roundNumber: number;
  ticketNumber: string;
  waiterName: string;
  notes: string | null;
  dispatchedAt: string | null;
}

export interface OpenPosOrder {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  tableId: string | null;
  tableName: string | null;
  bookingId: string | null;
  bookingLabel: string | null;
  subtotal: number;
  discount: number;
  total: number;
  roundCount: number;
  pendingItemCount: number;
  lastRoundAt: string | null;
  openedAt: string;
  items: PosOrderItem[];
  rounds: PosOrderRound[];
}

export interface CartLine {
  item: PosItem;
  quantity: number;
}

export interface StationTicket {
  station: ProductionStation;
  ticketNumber: string;
  orderId: string;
  tableName: string;
  waiterName: string;
  dispatchedAt: string;
  notes: string | null;
  items: Array<{
    name: string;
    quantity: number;
    notes: string | null;
  }>;
}

export interface SettlementReceipt {
  orderNumber: string;
  destination: string;
  issuedAt: string;
  openedAt: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeDue: number;
  paymentLabel: string;
  roundCount: number;
}

export interface ReceiptLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  roundNumber?: number;
  station?: ProductionStation;
  dispatched?: boolean;
}
