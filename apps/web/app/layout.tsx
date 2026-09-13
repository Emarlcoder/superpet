import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'SuperPet | Pet shop',
  description:
    'Alimentos y accesorios para perros y gatos. Retiro en local o envío a coordinar.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-UY">
      <body>{children}</body>
    </html>
  );
}
