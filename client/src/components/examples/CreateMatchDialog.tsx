import { CreateMatchDialog } from '../CreateMatchDialog';

export default function CreateMatchDialogExample() {
  return (
    <CreateMatchDialog 
      onCreateMatch={(game, amount) => console.log('Creating match:', game, amount)}
      maxBet={500}
    />
  );
}
