import { StoreHeader } from '../components/storefront';

export default function Home() {
  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <StoreHeader />
      <main id="contenido">
        <section className="hero">
          <div className="hero-copy">
            <p className="intro">Bienvenidos a SuperPet</p>
            <h1>Todo empieza por cuidarlos bien.</h1>
            <p className="lead">
              Alimentos, accesorios y pequeños favoritos para acompañar cada día
              de tu perro o gato.
            </p>
            <a className="button" href="/productos">
              Explorar productos
            </a>
          </div>
          <div className="hero-note">
            <span className="pet-word">Perros.</span>
            <span className="pet-word">Gatos.</span>
            <p>Un lugar para sus cosas favoritas.</p>
          </div>
        </section>
        <section
          id="catalogo"
          className="catalog"
          aria-labelledby="catalog-title"
        >
          <div>
            <p className="intro">Nuestra tienda</p>
            <h2 id="catalog-title">Lo que necesitan, en un solo lugar.</h2>
          </div>
          <ul className="categories" aria-label="Categorías">
            <li>Alimentos</li>
            <li>Accesorios</li>
            <li>Juguetes</li>
            <li>Higiene</li>
          </ul>
          <div className="empty">
            <h3>Elegí. Revisá. Coordiná.</h3>
            <p>
              Armá tu carrito y coordiná tu pedido con SuperPet por WhatsApp.
              Encontrá bolsas cerradas y alimento suelto por kilo.
            </p>
          </div>
          <a className="button" href="/productos">
            Ver catálogo
          </a>
        </section>
        <section className="delivery" aria-label="Cómo comprar">
          <div>
            <h2>A tu manera</h2>
            <p>Retiro en el local o envío a coordinar.</p>
          </div>
          <p>
            Elegí tus productos, revisá tu pedido y coordiná con nosotros por
            WhatsApp. El costo y los detalles del envío se acuerdan por ese
            medio.
          </p>
        </section>
      </main>
      <footer>
        <strong>SuperPet</strong>
        <span>El cuidado de todos los días.</span>
      </footer>
    </>
  );
}
