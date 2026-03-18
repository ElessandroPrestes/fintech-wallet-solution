import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Fintech Wallet',
};

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-500">Módulo de carteira em construção.</p>
      </div>
    </main>
  );
}
