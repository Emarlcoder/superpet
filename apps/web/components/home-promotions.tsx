import { getPromotions } from '../lib/public-data';
import { PromotionsCarousel } from './promotions';

export async function HomePromotions() {
  try {
    const items = await getPromotions();
    return <PromotionsCarousel items={items} />;
  } catch {
    return (
      <div className="promotion-placeholder" role="status">
        Las promociones no están disponibles en este momento.
      </div>
    );
  }
}
