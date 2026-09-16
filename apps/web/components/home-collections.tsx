import Link from 'next/link';
import { media, money } from '../lib/api';
import { getFilters, getHomeProducts } from '../lib/public-data';

function CategoryIcon({ name }: { name: string }) {
  const category = name.toLocaleLowerCase();
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {category.includes('alimento') ? (
        <>
          <path d="M8 24h32l-4 14H12zM6 38h36" />
          <path d="M16 17c-3-4 3-4 0-8M25 18c-3-4 3-4 0-8M33 17c-3-4 3-4 0-8" />
        </>
      ) : category.includes('juguete') ? (
        <>
          <circle cx="24" cy="24" r="16" />
          <path d="M10 17c12 0 22 9 23 22M19 9c-1 13 8 23 21 23" />
        </>
      ) : category.includes('higiene') ? (
        <>
          <path d="M17 20h14v20H17zM20 14h8v6M24 14V8h12" />
          <circle cx="9" cy="24" r="3" />
          <circle cx="37" cy="18" r="3" />
        </>
      ) : (
        <>
          <path d="M10 18h28v13H10z" />
          <rect x="19" y="15" width="10" height="19" rx="2" />
          <path d="M24 34v6" />
          <circle cx="24" cy="41" r="3" />
        </>
      )}
    </svg>
  );
}
export async function HomeCollections() {
  const [productResult, filterResult] = await Promise.allSettled([
    getHomeProducts(),
    getFilters(),
  ]);
  const products =
    productResult.status === 'fulfilled' ? productResult.value.items : [];
  const filters =
    filterResult.status === 'fulfilled'
      ? filterResult.value
      : { categories: [], brands: [] };
  const error = productResult.status === 'rejected';
  return (
    <>
      <section
        className="home-section pet-selection"
        aria-labelledby="pet-title"
      >
        <h2 id="pet-title">Todo para tu mejor compañía</h2>
        <div className="pet-links">
          <Link href="/productos?species=dog">
            <span className="pet-symbol" aria-hidden="true">
              🐕
            </span>
            <div>
              <h3>Perros</h3>
              <p>Alimentos, paseos y mucho juego</p>
              <span>Ver productos</span>
            </div>
          </Link>
          <Link href="/productos?species=cat">
            <span className="pet-symbol" aria-hidden="true">
              🐈
            </span>
            <div>
              <h3>Gatos</h3>
              <p>Sus favoritos, a su manera</p>
              <span>Ver productos</span>
            </div>
          </Link>
        </div>
      </section>
      <section
        className="home-section"
        id="categorias"
        aria-labelledby="categories-title"
      >
        <div className="section-heading">
          <h2 id="categories-title">Comprá por categoría</h2>
          <Link href="/productos">Ver todo</Link>
        </div>
        <div className="home-category-links">
          {filters.categories.map((c) => (
            <Link key={c.id} href={'/productos?category=' + c.id}>
              <span className="category-mark" aria-hidden="true">
                <CategoryIcon name={c.name} />
              </span>
              {c.name}
            </Link>
          ))}
        </div>
        {!filters.categories.length && (
          <p>
            Explorá los productos disponibles en nuestro{' '}
            <Link href="/productos">catálogo</Link>.
          </p>
        )}
      </section>
      <section
        className="home-section home-products"
        aria-labelledby="products-title"
      >
        <div className="section-heading">
          <h2 id="products-title">Encontrá su próximo favorito</h2>
          <Link href="/productos">Ver catálogo</Link>
        </div>
        {error ? (
          <p>
            No pudimos cargar los productos.{' '}
            <Link href="/productos">Ir al catálogo</Link>
          </p>
        ) : products.length === 0 ? (
          <p>
            Estamos preparando nuestro catálogo. Pronto vas a encontrar nuestros
            productos acá.
          </p>
        ) : (
          <div className="home-product-grid">
            {products.map((p) => {
              const sku = p.skus.find((s) => s.saleUnit === 'unit');
              const photo = p.images[0];
              return (
                <Link
                  className="home-product"
                  key={p.id}
                  href={'/productos/' + p.slug}
                >
                  {photo?.variants[0] && (
                    <img
                      src={media(photo.variants[0].key, photo.variants[0].url)}
                      alt={photo.alt}
                      loading="lazy"
                      width="240"
                      height="220"
                    />
                  )}
                  <h3>{p.name}</h3>
                  <p className="product-price">
                    {sku ? money(sku.priceMinor) : 'No disponible'}
                  </p>
                  <small>Por bolsa / unidad</small>
                  <span className="product-open">
                    {p.skus.some((s) => s.maxSelectable > 0)
                      ? 'Ver producto'
                      : 'Agotado'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <section
        className="home-section"
        id="marcas"
        aria-labelledby="brands-title"
      >
        <div className="section-heading">
          <h2 id="brands-title">Marcas para cuidarlos</h2>
          <Link href="/productos">Explorar catálogo</Link>
        </div>
        <div className="home-brands">
          {filters.brands.map((b) => (
            <Link key={b.id} href={'/productos?brand=' + b.id}>
              {b.name}
            </Link>
          ))}
        </div>
        {!filters.brands.length && (
          <p>Consultá las marcas disponibles en el catálogo.</p>
        )}
      </section>
    </>
  );
}
