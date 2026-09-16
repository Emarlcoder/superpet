'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadCart } from '../lib/cart-storage';
export function StoreHeader() {
  const [count, setCount] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
            unoptimized
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
      <nav className="store-nav" aria-label="Categorías de productos">
        <Menu
          label="Perros"
          open={openMenu === 'dogs'}
          onOpen={() => setOpenMenu('dogs')}
          onClose={() => setOpenMenu(null)}
          items={[
            ['Alimento seco', '/productos?species=dog&q=Alimento+seco'],
            ['Alimento húmedo', '/productos?species=dog&q=Alimento+húmedo'],
            ['Snacks', '/productos?species=dog&q=Snacks'],
          ]}
        />
        <Menu
          label="Gatos"
          open={openMenu === 'cats'}
          onOpen={() => setOpenMenu('cats')}
          onClose={() => setOpenMenu(null)}
          items={[
            ['Alimento seco', '/productos?species=cat&q=Alimento+seco'],
            ['Alimento húmedo', '/productos?species=cat&q=Alimento+húmedo'],
            ['Snacks', '/productos?species=cat&q=Snacks'],
          ]}
        />
        <Menu
          label="Cuidado e higiene"
          open={openMenu === 'care'}
          onOpen={() => setOpenMenu('care')}
          onClose={() => setOpenMenu(null)}
          items={[
            ['Piedras y arenas', '/productos?q=Piedras+y+arenas'],
            ['Pañales', '/productos?q=Pañales'],
            ['Perfumes', '/productos?q=Perfumes'],
            ['Cepillos', '/productos?q=Cepillos'],
            ['Shampoos', '/productos?q=Shampoos'],
            ['Bolsas', '/productos?q=Bolsas'],
          ]}
        />
        <Menu
          label="Accesorios y juguetes"
          open={openMenu === 'accessories'}
          onOpen={() => setOpenMenu('accessories')}
          onClose={() => setOpenMenu(null)}
          items={[
            ['Transportadoras', '/productos?q=Transportadoras'],
            [
              'Collares, correas y arneses',
              '/productos?q=Collares%2C+correas+y+arneses',
            ],
            ['Juguetes', '/productos?q=Juguetes'],
            ['Camas', '/productos?q=Camas'],
            ['Rascadores', '/productos?q=Rascadores'],
            ['Comederos', '/productos?q=Comederos'],
            ['Ropa', '/productos?q=Ropa'],
          ]}
        />
      </nav>
    </header>
  );
}

function Menu({
  label,
  items,
  open,
  onOpen,
  onClose,
}: {
  label: string;
  items: Array<[string, string]>;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="store-nav-menu">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? onClose() : onOpen())}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        {label}
      </button>
      {open && (
        <div className="store-nav-panel" role="menu" aria-label={label}>
          {items.map(([name, href]) => (
            <Link key={name} href={href} role="menuitem" onClick={onClose}>
              {name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
