import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fintech Wallet',
  description: 'Carteira financeira digital para transferências e depósitos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
