import { StoreHeader } from '../../components/store-header';
import { Catalog } from '../../components/catalog';

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
