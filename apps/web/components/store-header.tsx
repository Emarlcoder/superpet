'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadCart } from '../lib/cart-storage';
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
