'use client';

import { logoutAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <span className="text-sm font-semibold text-gray-900">Fintech Wallet</span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-auto px-3 py-1.5 text-xs">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
