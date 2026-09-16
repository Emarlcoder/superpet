export type CartItem = {
  skuId: string;
  quantity: number;
  name: string;
  label: string;
  saleUnit: 'unit' | 'kg';
  priceMinor: string;
};
const CART = 'superpet-cart';

export function loadCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CART) ?? '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (l): l is CartItem =>
              l &&
              typeof l.skuId === 'string' &&
              Number.isSafeInteger(l.quantity) &&
              l.quantity > 0 &&
              l.quantity <= 999 &&
              typeof l.name === 'string' &&
              typeof l.label === 'string' &&
              ['unit', 'kg'].includes(l.saleUnit) &&
              typeof l.priceMinor === 'string' &&
              /^\d{1,12}$/.test(l.priceMinor),
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-update'));
}
