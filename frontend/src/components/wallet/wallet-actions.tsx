'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DepositModal } from './deposit-modal';
import { TransferModal } from './transfer-modal';

export function WalletActions() {
  const [modal, setModal] = useState<'deposit' | 'transfer' | null>(null);

  return (
    <>
      <div className="flex gap-3">
        <Button onClick={() => setModal('deposit')} className="flex-1">
          Depositar
        </Button>
        <Button onClick={() => setModal('transfer')} variant="ghost" className="flex-1">
          Transferir
        </Button>
      </div>

      {modal === 'deposit' && <DepositModal onClose={() => setModal(null)} />}
      {modal === 'transfer' && <TransferModal onClose={() => setModal(null)} />}
    </>
  );
}
