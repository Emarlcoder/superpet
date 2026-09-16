import { StoreHeader } from '../../components/store-header';
import { Cart } from '../../components/cart';

export default function Page() {
  return (
    <>
      <StoreHeader />
      <main>
        <Cart />
      </main>
    </>
  );
}
