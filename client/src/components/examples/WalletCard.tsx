import { WalletCard } from '../WalletCard';

export default function WalletCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <WalletCard 
        type="personal" 
        balance={1250.00}
        onDeposit={() => console.log('Deposit clicked')}
        onWithdraw={() => console.log('Withdraw clicked')}
      />
      <WalletCard type="escrow" balance={500.00} />
      <WalletCard 
        type="spectator" 
        balance={350.00}
        onDeposit={() => console.log('Add funds clicked')}
      />
    </div>
  );
}
