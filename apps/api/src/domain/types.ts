export type Line = {
  effectiveLineId: string;
  skuId: string;
  name: string;
  label: string;
  code: string;
  saleUnit: 'unit' | 'kg';
  quantity: number;
  inventoryQuantity: string;
  unitPriceMinor: string;
  lineTotalMinor: string;
};
export type StoreData = {
  name: string;
  whatsappNumber: string;
  address: string;
  hours: string;
  deliveryAreaText: string;
  deliveryConditions: string;
};
export type Principal = {
  adminId: string;
  sessionId: string;
  csrf: string;
  expiresAt: Date;
  lastActivityAt: Date;
};
