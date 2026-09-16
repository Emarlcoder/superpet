'use client';
import { useEffect, useState } from 'react';
import { media, type Promotion } from '../lib/api';

export function PromotionsCarousel({ items }: { items: Promotion[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => {
      preference.removeEventListener('change', update);
    };
  }, []);
  useEffect(() => {
    if (items.length < 2 || paused || hovered || reducedMotion) return;
    const timer = setInterval(
      () => setIndex((n) => (n + 1) % items.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [items.length, paused, hovered, reducedMotion]);
  if (!items.length) return null;
  const current = items[index % items.length]!;
  const imageSource = media(current.imageKey, current.imageUrl);
  const imageSources = imageSource.startsWith('https://ik.imagekit.io/')
    ? [...new Set([480, 768, current.width].filter((w) => w <= current.width))]
        .sort((a, b) => a - b)
        .map(
          (width) =>
            `${imageSource.replace('/superpet/', `/tr:w-${width}/superpet/`)} ${width}w`,
        )
        .join(', ')
    : undefined;
  const select = (next: number) => {
    setPaused(true);
    setIndex((next + items.length) % items.length);
  };
  return (
    <section
      className="promotions-carousel"
      aria-label="Promociones"
      aria-roledescription="carrusel"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
    >
      <div
        className="promotion-slide"
        role="group"
        aria-roledescription="diapositiva"
        aria-label={`${index + 1} de ${items.length}`}
      >
        <img
          key={current.id}
          src={imageSource}
          srcSet={imageSources}
          sizes="(max-width: 1200px) calc(100vw - 32px), 1168px"
          width={current.width}
          height={current.height}
          alt={`Promoción de SuperPet ${index + 1}`}
          fetchPriority={index === 0 ? 'high' : 'auto'}
        />
      </div>
      {items.length > 1 && (
        <div className="carousel-controls">
          <button
            type="button"
            onClick={() => select(index - 1)}
            aria-label="Promoción anterior"
          >
            ←
          </button>
          <div className="carousel-dots" aria-label="Elegir promoción">
            {items.map((item, n) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Ver promoción ${n + 1}`}
                aria-current={index === n ? 'true' : undefined}
                onClick={() => select(n)}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => select(index + 1)}
            aria-label="Promoción siguiente"
          >
            →
          </button>
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Reanudar carrusel' : 'Pausar carrusel'}
            >
              {paused ? 'Reanudar' : 'Pausar'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
