'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  api,
  ApiError,
  media,
  money,
  type Product,
  type Sku,
  type Store,
  type Line,
} from '../lib/api';

type CartItem = {
  skuId: string;
  quantity: number;
  name: string;
  label: string;
  saleUnit: 'unit' | 'kg';
  priceMinor: string;
};
const CART = 'superpet-cart';
const ATTEMPT = 'superpet-attempt';
function loadCart(): CartItem[] {
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
function saveCart(items: CartItem[]) {
  localStorage.setItem(CART, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-update'));
}
export function StoreHeader() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () =>
      setCount(loadCart().reduce((n, l) => n + l.quantity, 0));
    update();
    window.addEventListener('cart-update', update);
    return () => window.removeEventListener('cart-update', update);
  }, []);
  return (
    <header className="store-header">
      <div className="store-announcement">
        Retiro en el local · Envíos a coordinar · Ciudad de la Costa
      </div>
      <div className="header">
        <Link href="/" aria-label="SuperPet, inicio" className="brand">
          <Image
            src="/logo.png"
            alt="SuperPet Pet Shop"
            width={144}
            height={78}
            priority
            className="logo"
          />
        </Link>
        <form className="header-search" action="/productos" role="search">
          <label className="sr-only" htmlFor="header-query">
            Buscar productos
          </label>
          <input
            id="header-query"
            name="q"
            type="search"
            placeholder="¿Qué necesita tu mascota?"
          />
          <button aria-label="Buscar" type="submit">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="6" />
              <path d="m15 15 6 6" />
            </svg>
          </button>
        </form>
        <Link className="header-help" href="/#como-comprar">
          ¿Cómo comprar?<small>Coordiná por WhatsApp</small>
        </Link>
        <Link className="header-cart" href="/carrito">
          <svg
            viewBox="0 0 24 24"
            width="27"
            height="27"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M2 3h3l3 13h12l2-9H6" />
            <circle cx="9" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
          </svg>
          <span>
            Mi carrito
            <strong>
              {count} {count === 1 ? 'artículo' : 'artículos'}
            </strong>
          </span>
        </Link>
      </div>
      <nav className="store-nav" aria-label="Principal">
        <Link href="/productos">Todos los productos</Link>
        <Link href="/productos?species=dog">Perros</Link>
        <Link href="/productos?species=cat">Gatos</Link>
        <Link href="/#categorias">Categorías</Link>
        <Link href="/#marcas">Marcas</Link>
        <Link href="/#promociones">Promociones</Link>
      </nav>
    </header>
  );
}
export function Catalog() {
  const search = useSearchParams();
  const [category, setCategory] = useState(''),
    [brand, setBrand] = useState(''),
    [sort, setSort] = useState('name_asc'),
    [cursor, setCursor] = useState(''),
    [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
  }>({ categories: [], brands: [] });
  const [products, setProducts] = useState<Product[]>([]),
    [q, setQ] = useState(''),
    [species, setSpecies] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    setSpecies(search.get('species') ?? '');
    setCategory(search.get('category') ?? '');
    setBrand(search.get('brand') ?? '');
    setQ(search.get('q') ?? '');
    setCursor('');
  }, [search]);
  useEffect(() => {
    api<typeof filters>('/catalog/filters')
      .then(setFilters)
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({
      limit: '24',
      sort,
      ...(q ? { q } : {}),
      ...(species ? { species } : {}),
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
      ...(cursor ? { cursor } : {}),
    });
    const timer = setTimeout(() => {
      api<{ items: Product[]; nextCursor: string | null }>(
        '/products?' + params,
      )
        .then((data) => {
          if (active) {
            setProducts((previous) =>
              cursor ? [...previous, ...data.items] : data.items,
            );
            setNextCursor(data.nextCursor);
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [species, q, category, brand, sort, cursor]);
  return (
    <section className="catalog">
      <h1 className="page-title">Su próximo favorito</h1>
      <p>Alimentos y accesorios para perros y gatos.</p>
      <div className="filters">
        <label>
          Buscar productos
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor('');
            }}
            placeholder="Nombre del producto"
          />
        </label>
        <label>
          Para
          <select
            value={species}
            onChange={(e) => {
              setSpecies(e.target.value);
              setCursor('');
            }}
          >
            <option value="">Perros y gatos</option>
            <option value="dog">Perros</option>
            <option value="cat">Gatos</option>
          </select>
        </label>
        <label>
          Categoría
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setCursor('');
            }}
          >
            <option value="">Todas</option>
            {filters.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Marca
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setCursor('');
            }}
          >
            <option value="">Todas</option>
            {filters.brands.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordenar
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setCursor('');
            }}
          >
            <option value="name_asc">Nombre</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">Cargando catálogo…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <div className="product-grid">
            {products
              .filter((p) =>
                p.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
              )
              .map((p) => (
                <Link
                  className="product-card"
                  href={'/productos/' + p.slug}
                  key={p.id}
                >
                  {p.images[0]?.variants[0] ? (
                    <img
                      src={media(p.images[0].variants[0].key)}
                      alt={p.images[0].alt}
                      className="product-image"
                    />
                  ) : (
                    <div className="product-image" />
                  )}
                  <h2>{p.name}</h2>
                  <p>
                    {p.skus.find((s) => s.saleUnit === 'unit')
                      ? money(
                          p.skus.find((s) => s.saleUnit === 'unit')!.priceMinor,
                        ) + ' por bolsa / unidad'
                      : 'No disponible'}
                  </p>
                  <span>
                    {p.skus.some((s) => s.maxSelectable > 0)
                      ? 'Ver producto'
                      : 'Agotado'}
                  </span>
                </Link>
              ))}
          </div>
          {nextCursor && (
            <button className="secondary" onClick={() => setCursor(nextCursor)}>
              Ver más productos
            </button>
          )}
          {!products.length && (
            <div className="empty">
              <h2>No hay productos para mostrar</h2>
              <p>
                Probá otra búsqueda o volvé pronto para conocer las novedades.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
export function ProductDetail({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null),
    [selected, setSelected] = useState(''),
    [quantity, setQuantity] = useState(1),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    api<Product>('/products/' + encodeURIComponent(slug))
      .then((p) => {
        setProduct(p);
        setSelected(
          p.skus.find((s) => s.saleUnit === 'unit')?.id ?? p.skus[0]?.id ?? '',
        );
      })
      .catch((e) => setError(e.message));
  }, [slug]);
  if (error) return <p role="alert">{error}</p>;
  if (!product) return <p role="status">Cargando producto…</p>;
  const sku = product.skus.find((s) => s.id === selected);
  function add(sku: Sku) {
    const cart = loadCart(),
      existing = cart.find((l) => l.skuId === sku.id);
    const next = quantity + (existing?.quantity ?? 0);
    if (next > sku.maxSelectable) {
      setNotice(
        'La cantidad total supera la disponibilidad. Revisá tu carrito.',
      );
      return;
    }
    saveCart([
      ...cart.filter((l) => l.skuId !== sku.id),
      {
        skuId: sku.id,
        quantity: next,
        name: product!.name,
        label: sku.label,
        saleUnit: sku.saleUnit,
        priceMinor: sku.priceMinor,
      },
    ]);
    setNotice('Agregado a tu carrito.');
  }
  return (
    <section className="product-detail">
      <div className="gallery">
        {product.images.map((image) => (
          <img
            key={image.id}
            src={media(image.variants.at(-1)!.key)}
            alt={image.alt}
          />
        ))}
      </div>
      <div>
        <Link href="/productos">Volver al catálogo</Link>
        <h1 className="page-title">{product.name}</h1>
        <p className="description">{product.description}</p>
        {product.skus.length > 1 && (
          <label>
            Cómo lo querés comprar
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setQuantity(1);
                setNotice('');
              }}
            >
              {product.skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {sku && (
          <>
            <p className="price">
              {money(sku.priceMinor)}{' '}
              <small>por {sku.saleUnit === 'kg' ? 'kg' : 'unidad'}</small>
            </p>
            <label>
              Cantidad ({sku.saleUnit === 'kg' ? 'kg' : 'unidades'})
              <input
                type="number"
                min="1"
                max={sku.maxSelectable}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <p>{sku.maxSelectable > 0 ? 'Disponible' : 'Agotado'}</p>
            <button
              disabled={
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > sku.maxSelectable
              }
              onClick={() => add(sku)}
            >
              Agregar al carrito
            </button>
          </>
        )}
        <p role="status">{notice}</p>
        <p>Retiro en el local o envío a coordinar. Sin pago online.</p>
      </div>
    </section>
  );
}
type Quote = {
  quoteId: string;
  expiresAt: string;
  lines: Line[];
  subtotalMinor: string;
  whatsappNumber: string;
};
type Attempt = {
  key: string;
  epoch: string;
  expires: number;
  body: {
    quoteId: string;
    items: Array<{ skuId: string; quantity: number }>;
    deliveryMode: 'pickup' | 'shipping';
    customer: { name: string; phone: string };
  };
  quote: Quote;
  receipt?: { reference: string };
};
export function Cart() {
  const submitting = useRef(false);
  const [terminalFailure, setTerminalFailure] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]),
    [name, setName] = useState(''),
    [phone, setPhone] = useState('+598'),
    [delivery, setDelivery] = useState<'pickup' | 'shipping'>('pickup'),
    [store, setStore] = useState<Store | null>(null),
    [quote, setQuote] = useState<Quote | null>(null),
    [attempt, setAttempt] = useState<Attempt | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setCart(loadCart());
    api<Store>('/store')
      .then(setStore)
      .catch((e) => setError(e.message));
    try {
      const a = JSON.parse(
        sessionStorage.getItem(ATTEMPT) ?? 'null',
      ) as Attempt | null;
      if (a && a.expires > Date.now()) {
        setAttempt(a);
        setName(a.body.customer.name);
        setPhone(a.body.customer.phone);
        setDelivery(a.body.deliveryMode);
      } else sessionStorage.removeItem(ATTEMPT);
    } catch {
      sessionStorage.removeItem(ATTEMPT);
    }
  }, []);
  function update(items: CartItem[]) {
    setCart(items);
    saveCart(items);
    setQuote(null);
  }
  async function quoteCart() {
    setBusy(true);
    setError('');
    try {
      const value = await api<Quote>('/cart/quote', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(({ skuId, quantity }) => ({ skuId, quantity })),
          deliveryMode: delivery,
        }),
      });
      setQuote(value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function coordinate() {
    if (submitting.current) return;
    if (!store || (!attempt && !quote)) return;
    submitting.current = true;
    setTerminalFailure(false);
    setBusy(true);
    setError('');
    const a = attempt ?? {
      key: crypto.randomUUID(),
      epoch: store.operationEpoch,
      expires: Date.now() + 86400000,
      body: {
        quoteId: quote!.quoteId,
        items: quote!.lines.map(({ skuId, quantity }) => ({ skuId, quantity })),
        deliveryMode: delivery,
        customer: { name: name.trim(), phone },
      },
      quote: quote!,
    };
    try {
      sessionStorage.setItem(ATTEMPT, JSON.stringify(a));
      setAttempt(a);
      const receipt = await api<{ reference: string }>('/purchases', {
        method: 'POST',
        headers: { 'Idempotency-Key': a.key, 'X-Operation-Epoch': a.epoch },
        body: JSON.stringify(a.body),
      });
      const saved = { ...a, receipt };
      setAttempt(saved);
      sessionStorage.setItem(ATTEMPT, JSON.stringify(saved));
      window.location.assign(whatsappUrl(saved));
    } catch (e) {
      setTerminalFailure(
        e instanceof ApiError &&
          [
            'QUOTE_EXPIRED',
            'QUOTE_MISMATCH',
            'STORE_CHANGED',
            'PRICE_CHANGED',
            'CATALOG_CHANGED',
            'STOCK_INSUFFICIENT',
            'VALIDATION_ERROR',
            'INVALID_QUANTITY',
          ].includes(e.code),
      );
      setError(
        (e as Error).message +
          ' Si hubo un corte, resolvé este mismo intento antes de crear otro.',
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function message(a: Attempt) {
    return [
      'Hola SuperPet, soy ' + a.body.customer.name + '.',
      'Pedido ' + a.receipt?.reference,
      ...a.quote.lines.map(
        (l) =>
          l.name +
          ' — ' +
          l.label +
          ': ' +
          l.quantity +
          ' ' +
          (l.saleUnit === 'kg' ? 'kg' : 'un.') +
          ' × ' +
          money(l.unitPriceMinor) +
          ' = ' +
          money(l.lineTotalMinor),
      ),
      'Subtotal: ' + money(a.quote.subtotalMinor),
      a.body.deliveryMode === 'shipping'
        ? 'Envío: costo y cobertura a coordinar.'
        : 'Retiro en local.',
      'Disponibilidad a confirmar.',
    ].join('\n');
  }
  function whatsappUrl(a: Attempt) {
    const full = message(a);
    const text =
      encodeURIComponent(full).length > 1800
        ? 'Hola SuperPet. Quiero coordinar el pedido ' +
          a.receipt?.reference +
          '. Voy a pegar el detalle completo a continuación.'
        : full;
    return (
      'https://wa.me/' +
      a.quote.whatsappNumber.replace(/\D/g, '') +
      '?text=' +
      encodeURIComponent(text)
    );
  }
  function newAttempt() {
    sessionStorage.removeItem(ATTEMPT);
    setAttempt(null);
    setQuote(null);
    setError('');
  }
  return (
    <section className="catalog cart">
      <h1 className="page-title">Tu carrito</h1>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {attempt?.receipt ? (
        <div className="notice">
          <h2>Solicitud registrada</h2>
          <p>{attempt.receipt.reference}</p>
          <p>Enviá el mensaje por WhatsApp para coordinar tu compra.</p>
          <a
            className="button"
            target="_blank"
            rel="noreferrer"
            href={whatsappUrl(attempt)}
          >
            Abrir WhatsApp
          </a>
          {encodeURIComponent(message(attempt)).length > 1800 && (
            <p>
              El pedido es largo: copiá el detalle completo y pegalo en el chat.
              El enlace incluye tu referencia.
            </p>
          )}
          <button
            className="secondary"
            onClick={() =>
              navigator.clipboard
                .writeText(message(attempt))
                .catch(() =>
                  setError(
                    'No se pudo copiar. Seleccioná el texto del pedido.',
                  ),
                )
            }
          >
            Copiar pedido
          </button>
          <pre>{message(attempt)}</pre>
          <button className="secondary" onClick={newAttempt}>
            Preparar un nuevo pedido
          </button>
          <p>Un pedido nuevo no modifica el anterior.</p>
        </div>
      ) : (
        <>
          <div className="cart-lines">
            {cart.map((l) => (
              <div key={l.skuId} className="cart-line">
                <div>
                  <strong>{l.name}</strong>
                  <p>
                    {l.label} · {money(l.priceMinor)} /{' '}
                    {l.saleUnit === 'kg' ? 'kg' : 'unidad'}
                  </p>
                </div>
                <label>
                  Cantidad
                  <input
                    disabled={!!attempt || busy}
                    type="number"
                    min="1"
                    max={l.saleUnit === 'kg' ? 5 : 999}
                    step="1"
                    value={l.quantity}
                    onChange={(e) =>
                      update(
                        cart.map((x) =>
                          x.skuId === l.skuId
                            ? { ...x, quantity: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="secondary"
                  disabled={!!attempt || busy}
                  onClick={() =>
                    update(cart.filter((x) => x.skuId !== l.skuId))
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          {!cart.length ? (
            <p>
              Tu carrito está vacío.{' '}
              <Link href="/productos">Explorar productos</Link>
            </p>
          ) : (
            <>
              <div className="form-grid">
                <label>
                  Tu nombre
                  <input
                    value={name}
                    disabled={!!attempt || busy}
                    maxLength={120}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    value={phone}
                    disabled={!!attempt || busy}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    type="tel"
                  />
                </label>
                <label>
                  Entrega
                  <select
                    value={delivery}
                    disabled={!!attempt || busy}
                    onChange={(e) => {
                      setDelivery(e.target.value as 'pickup' | 'shipping');
                      setQuote(null);
                    }}
                  >
                    <option value="pickup">Retiro en local</option>
                    <option value="shipping">Envío a coordinar</option>
                  </select>
                </label>
              </div>
              {delivery === 'shipping' && (
                <p>
                  {store?.deliveryAreaText}. El envío se coordina por WhatsApp.
                </p>
              )}
              {quote && (
                <div className="notice">
                  <h2>Revisá los precios actualizados</h2>
                  {quote.lines.map((l) => (
                    <p key={l.skuId}>
                      {l.name} ({l.quantity} {l.saleUnit}):{' '}
                      {money(l.lineTotalMinor)}
                    </p>
                  ))}
                  <strong>Subtotal: {money(quote.subtotalMinor)}</strong>
                </div>
              )}
              {!attempt && !quote ? (
                <button
                  disabled={
                    busy ||
                    !cart.every(
                      (l) => Number.isInteger(l.quantity) && l.quantity > 0,
                    )
                  }
                  onClick={quoteCart}
                >
                  {busy ? 'Consultando…' : 'Revisar pedido'}
                </button>
              ) : (
                <button
                  disabled={
                    busy ||
                    !name.trim() ||
                    !/^\+[1-9]\d{7,14}$/.test(phone.replace(/[ ()-]/g, '')) ||
                    !store
                  }
                  onClick={coordinate}
                >
                  {busy
                    ? 'Registrando…'
                    : attempt
                      ? 'Resolver este intento'
                      : 'Coordinar por WhatsApp'}
                </button>
              )}
              {attempt && !attempt.receipt && terminalFailure && (
                <button className="secondary" onClick={newAttempt}>
                  Descartar intento y revisar de nuevo
                </button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
