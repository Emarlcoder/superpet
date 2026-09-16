'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, money, type Store, type Line } from '../lib/api';
import { loadCart, saveCart, type CartItem } from '../lib/cart-storage';
const ATTEMPT = 'superpet-attempt';
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
