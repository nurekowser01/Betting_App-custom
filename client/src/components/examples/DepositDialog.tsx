import { useState } from 'react';
import { DepositDialog } from '../DepositDialog';
import { Button } from '@/components/ui/button';

export default function DepositDialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Deposit Dialog</Button>
      <DepositDialog
        open={open}
        onOpenChange={setOpen}
        onDeposit={(amount) => console.log('Depositing:', amount)}
      />
    </>
  );
}
