import { ProductDetail, StoreHeader } from '../../../components/storefront';
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
