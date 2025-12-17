import { Navbar } from '../Navbar';

export default function NavbarExample() {
  return (
    <Navbar
      username="ProGamer99"
      balance={1250.00}
      onLogout={() => console.log('Logout clicked')}
    />
  );
}
