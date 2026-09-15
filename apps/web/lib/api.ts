export const API = '/api/v1';
export type Variant = { key: string; width: number; height: number };
export type Sku = {
  id: string;
  code: string;
  label: string;
  saleUnit: 'kg' | 'unit';
  priceMinor: string;
  active: boolean;
  version: number;
  maxSelectable: number;
  stock?: string;
  stockVersion?: number;
  netWeightGrams: string | null;
};
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  species: Array<'dog' | 'cat'>;
  categoryId: string;
  brandId: string | null;
  status: string;
  version: number;
  skus: Sku[];
  images: Array<{ id: string; alt: string; variants: Variant[] }>;
};
export type Store = {
  name: string;
  whatsappNumber: string;
  address: string;
  hours: string;
  deliveryAreaText: string;
  deliveryConditions: string;
  version: number;
  operationEpoch: string;
};
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
export type Purchase = {
  id: string;
  reference: string;
  channel: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  deliveryMode: 'pickup' | 'shipping';
  shippingMinor: string | null;
  notes: string;
  lines: Line[];
  effectiveLines: Line[];
  subtotalMinor: string;
  effectiveSubtotalMinor: string;
  version: number;
  createdAt: string;
  events?: Array<{
    id: string;
    kind: string;
    reason: string;
    createdAt: string;
    detail: unknown;
  }>;
  returns?: Array<{ effectiveLineId: string; quantity: number }>;
};
export function money(value: string) {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
  }).format(Number(value) / 100);
}
export function media(key: string) {
  return process.env.NEXT_PUBLIC_MEDIA_URL
    ? process.env.NEXT_PUBLIC_MEDIA_URL + '/' + key
    : API + '/media/' + key;
}
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  VALIDATION_ERROR: 'Revisá los datos ingresados y las cantidades.',
  QUOTE_EXPIRED:
    'La cotización venció. Revisá nuevamente los precios antes de enviar.',
  PRICE_CHANGED: 'Cambió un precio. Revisá nuevamente el pedido.',
  STORE_CHANGED:
    'Cambió la configuración del local. Revisá nuevamente el pedido.',
  CATALOG_CHANGED: 'Un producto ya no está disponible. Revisá tu carrito.',
  IDEMPOTENCY_EXPIRED:
    'Venció la recuperación de este intento. Consultá con el local antes de crear otro pedido.',
  IDEMPOTENCY_CONFLICT:
    'Este intento tiene datos diferentes. Conservá la referencia y consultá con el local.',
  IDEMPOTENCY_IN_PROGRESS:
    'El intento todavía se está procesando. Reintentá con el mismo pedido.',
  IMAGE_INVALID: 'El archivo no es una imagen válida.',
  IMAGE_DIMENSIONS_INVALID:
    'La imagen debe medir entre 300 y 6000 píxeles por lado y hasta 16 megapíxeles.',
  IMAGE_TYPE_UNSUPPORTED: 'Usá una imagen estática JPEG, PNG o WebP.',
  IMAGE_STORAGE_UNAVAILABLE:
    'No se pudo guardar la imagen. Reintentá con el mismo archivo.',
  MEDIA_NOT_CONFIGURED:
    'Todavía falta configurar el almacenamiento de imágenes. El producto está guardado; podrás agregar sus fotos cuando esté conectado.',
  LAST_PUBLISHED_IMAGE:
    'Agregá otra foto o pasá el producto a borrador antes de quitar su última imagen.',
  ALREADY_EXISTS: 'Ya existe un registro con ese código o identificador.',
  RESET_TOKEN_INVALID:
    'El enlace venció o ya fue usado. Probá iniciar sesión con tu nueva contraseña o solicitá otro enlace.',
  EMAIL_TOKEN_INVALID: 'El enlace de verificación venció o ya fue usado.',
  UNAUTHENTICATED: 'Tu sesión venció. Volvé a iniciar sesión.',
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  STOCK_INSUFFICIENT: 'No hay stock suficiente para completar la operación.',
  VERSION_CONFLICT: 'Los datos cambiaron. Actualizá y revisá antes de guardar.',
  RATE_LIMITED: 'Demasiados intentos. Esperá un momento antes de continuar.',
  PRODUCT_INCOMPLETE:
    'Agregá al menos una presentación activa y una foto antes de publicar.',
  STORE_NOT_CONFIGURED: 'El local todavía no configuró su número de WhatsApp.',
  PASSWORD_POLICY_VIOLATION:
    'Usá una contraseña de 8 a 128 caracteres que no sea común.',
  CORRECTION_AFTER_RETURN:
    'Esta venta ya tiene devoluciones: solo se puede corregir el precio.',
  RECOVERY_REVIEW_REQUIRED:
    'El sistema fue restaurado. Revisá el pedido con el local antes de repetirlo.',
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(API + path, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    signal: options.signal ?? AbortSignal.timeout(90000),
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  let result;
  try {
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error('Unexpected content type');
    result = await response.json();
    if (result === null || typeof result !== 'object')
      throw new Error('Unexpected response');
  } catch {
    throw new ApiError(
      'API_UNAVAILABLE',
      response.status,
      'No pudimos conectar con el servicio. Intentá nuevamente en unos minutos.',
    );
  }
  if (!response.ok)
    throw new ApiError(
      result.code ?? 'REQUEST_FAILED',
      response.status,
      messages[result.code] ??
        result.message ??
        'No se pudo completar la operación.',
    );
  return result as T;
}
