import type { Metadata } from 'next';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = {
  title: 'Criar conta | Fintech Wallet',
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Fintech Wallet</h1>
          <p className="mt-1 text-sm text-gray-500">Crie sua conta para começar</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
