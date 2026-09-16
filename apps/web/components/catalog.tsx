'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, media, money, type Product } from '../lib/api';
export function Catalog() {
  const search = useSearchParams();
  return <CatalogResults key={search.toString()} initial={search} />;
}
function CatalogResults({
  initial,
}: {
  initial: { get(name: string): string | null };
}) {
  const [category, setCategory] = useState(initial.get('category') ?? ''),
    [brand, setBrand] = useState(initial.get('brand') ?? ''),
    [sort, setSort] = useState('name_asc'),
    [cursor, setCursor] = useState(''),
    [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
  }>({ categories: [], brands: [] });
  const [products, setProducts] = useState<Product[]>([]),
    [q, setQ] = useState(initial.get('q') ?? ''),
    [settledQ, setSettledQ] = useState(q),
    [species, setSpecies] = useState(initial.get('species') ?? ''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (q === settledQ) return;
    const timer = setTimeout(() => {
      setSettledQ(q);
      setCursor('');
    }, 250);
    return () => clearTimeout(timer);
  }, [q, settledQ]);
  useEffect(() => {
    const controller = new AbortController();
    api<typeof filters>('/catalog/filters', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]),
    })
      .then(setFilters)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    // Cancel obsolete requests immediately; debounce only typing, not navigation.
    if (q !== settledQ) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: '24',
      sort,
      ...(q ? { q } : {}),
      ...(species ? { species } : {}),
      ...(category ? { category } : {}),
      ...(brand ? { brand } : {}),
      ...(cursor ? { cursor } : {}),
    });
    api<{ items: Product[]; nextCursor: string | null }>(
      '/products?' + params,
      {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(90000),
        ]),
      },
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
    return () => {
      active = false;
      controller.abort();
    };
  }, [species, q, settledQ, category, brand, sort, cursor]);
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
            {products.map((p) => (
              <Link
                className="product-card"
                href={'/productos/' + p.slug}
                key={p.id}
              >
                {p.images[0]?.variants[0] ? (
                  <img
                    src={media(
                      p.images[0].variants[0].key,
                      p.images[0].variants[0].url,
                    )}
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
