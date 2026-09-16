import { StoreHeader } from '../../../components/store-header';
import { ProductDetail } from '../../../components/product-detail';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      <StoreHeader />
      <main>
        <ProductDetail slug={slug} />
      </main>
    </>
  );
}
