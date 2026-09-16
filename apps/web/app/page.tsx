import { StoreHeader } from '../components/store-header';

import { HomePromotions } from '../components/home-promotions';
import { Suspense } from 'react';
import { HomeCollections } from '../components/home-collections';

export default function Home() {
  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <StoreHeader />
      <main id="contenido">
        <h1 className="sr-only">SuperPet — todo para perros y gatos</h1>
        <div id="promociones">
          <Suspense
            fallback={
              <div
                className="promotion-placeholder"
                aria-label="Cargando promociones"
              />
            }
          >
            <HomePromotions />
          </Suspense>
        </div>
        <div className="shopping-benefits">
          <div>
            <strong>Retirá en el local</strong>
            <span>Coordinamos cuándo pasar</span>
          </div>
          <div>
            <strong>Envíos a coordinar</strong>
            <span>Consultá cobertura y costo</span>
          </div>
          <div>
            <strong>Comprá a tu manera</strong>
            <span>Bolsas cerradas y alimento por kilo</span>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="home-section" role="status">
              Cargando catálogo…
            </div>
          }
        >
          <HomeCollections />
        </Suspense>
        <section
          className="home-how"
          id="como-comprar"
          aria-labelledby="how-title"
        >
          <div>
            <h2 id="how-title">Tu pedido, así de simple</h2>
            <p>Elegí lo que necesitan. El resto lo coordinamos juntos.</p>
          </div>
          <ol>
            <li>
              <strong>Armá tu carrito</strong>
              <span>Elegí productos y cantidades.</span>
            </li>
            <li>
              <strong>Coordiná por WhatsApp</strong>
              <span>Envianos el pedido desde el carrito.</span>
            </li>
            <li>
              <strong>Retirá o recibí en casa</strong>
              <span>Acordamos entrega y pago por chat.</span>
            </li>
          </ol>
        </section>
      </main>
      <footer className="store-footer">
        <div>
          <strong>SuperPet</strong>
          <p>El cuidado de todos los días.</p>
          <span>Ciudad de la Costa, Uruguay</span>
        </div>
        <div>
          <h2>Explorá la tienda</h2>
          <a href="/productos?species=dog">Perros</a>
          <a href="/productos?species=cat">Gatos</a>
          <a href="/productos">Todos los productos</a>
        </div>
        <div>
          <h2>Tu compra</h2>
          <a href="/#como-comprar">Cómo comprar</a>
          <a href="/carrito">Mi carrito</a>
          <p>Entrega y pago a coordinar por WhatsApp.</p>
        </div>
      </footer>
    </>
  );
}
