'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, media, money, type Product, type Sku } from '../lib/api';
import { loadCart, saveCart } from '../lib/cart-storage';
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
        {product.images.map((image, index) => {
          const variants = [...image.variants].sort(
            (a, b) => a.width - b.width,
          );
          const largest = variants.at(-1);
          if (!largest) return null;
          return (
            <img
              key={image.id}
              src={media(largest.key, largest.url)}
              srcSet={variants
                .map(
                  (variant) =>
                    `${media(variant.key, variant.url)} ${variant.width}w`,
                )
                .join(', ')}
              sizes="(max-width: 440px) calc(100vw - 32px), (max-width: 800px) calc(100vw - 64px), (max-width: 1200px) calc((100vw - 112px) / 2), 544px"
              width={largest.width}
              height={largest.height}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              alt={image.alt}
            />
          );
        })}
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
