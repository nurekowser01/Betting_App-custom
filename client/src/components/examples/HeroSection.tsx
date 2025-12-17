import { HeroSection } from '../HeroSection';

export default function HeroSectionExample() {
  return (
    <HeroSection
      onCreateMatch={() => console.log('Create match clicked')}
      onBrowseFixtures={() => console.log('Browse clicked')}
      totalBets={15234}
      activePlayers={487}
    />
  );
}
