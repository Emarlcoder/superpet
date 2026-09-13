import { Catalog, StoreHeader } from '../../components/storefront';
import { Suspense } from 'react';
export default function Page() {
  return (
    <>
      <StoreHeader />
      <main>
        <Suspense fallback={<p>Cargando catálogo…</p>}>
          <Catalog />
        </Suspense>
      </main>
    </>
  );
}
