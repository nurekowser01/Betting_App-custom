# Design Guidelines: PlayStation Gaming Betting Platform

## Design Approach

**Reference-Based Strategy:** Draw inspiration from PlayStation's official UI/UX, Steam, and modern gaming platforms (Twitch, Discord). Emphasis on bold typography, high-contrast layouts, and gaming-centric visual language that conveys energy and competition.

## Core Design Elements

### Typography
- **Primary Font:** Inter or Roboto for UI elements (via Google Fonts CDN)
- **Display Font:** Rajdhani or Orbitron for gaming-themed headings and match titles
- **Hierarchy:**
  - Hero/Page Titles: 4xl-6xl, bold/black weight
  - Section Headers: 2xl-3xl, semibold
  - Card Titles: lg-xl, medium
  - Body Text: base, regular
  - Supporting Text: sm, regular
  - Wallet Amounts/Bets: xl-2xl, bold (tabular numbers)

### Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Container: max-w-7xl
- Section padding: py-12 (mobile), py-20 (desktop)
- Card padding: p-6
- Button padding: px-6 py-3
- Grid gaps: gap-6 for cards, gap-4 for lists

### Component Library

**Navigation:**
- Fixed top navbar with glass morphism effect (backdrop-blur)
- Logo left, wallet balance indicator center-right, user menu right
- Mobile: hamburger menu with slide-in drawer

**Wallet Cards (3 distinct wallets):**
- Personal Wallet: Deposit/withdraw actions, balance prominently displayed
- Escrow Wallet: Active match funds locked, visual indicator of ongoing games
- Spectator Wallet: Betting balance for placing wagers on other matches
- Each card: Large balance display, transaction history preview, quick action buttons
- Grid layout: grid-cols-1 md:grid-cols-3, equal height cards

**Match/Fixture Cards:**
- Two-player matchup format with VS indicator centered
- Player avatars/usernames on opposing sides
- Game title, bet amount, match status badge (Live, Upcoming, Completed)
- For live matches: pulsing indicator, viewer count
- CTA buttons: "Join Match" (available), "Spectate/Bet" (live), "View Results" (completed)
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Betting Interface:**
- Slider for bet amount selection
- Quick bet buttons (50, 100, 500, Max)
- Odds display if applicable
- Confirm button with bet summary
- Modal overlay for bet confirmation

**Transaction History:**
- Table view with columns: Date, Type, Amount, Status
- Filter tabs: All, Deposits, Withdrawals, Bets, Winnings
- Responsive: stack columns on mobile

**Match Creation Form:**
- Game selection dropdown (PlayStation titles)
- Bet amount input with validation
- Match type: Public (anyone can join) vs Private (invite only)
- Match duration/settings
- Create Match CTA

### Hero Section
**Layout:** Full viewport height (h-screen), split asymmetric design
- Left 60%: Bold headline "Bet. Play. Win." with supporting tagline
- Animated counter showing total bets placed or active players
- Dual CTAs: "Create Match" (primary), "Browse Fixtures" (secondary) with backdrop-blur backgrounds
- Right 40%: Large hero image showing PlayStation controller with gaming setup or competitive gaming scene
- Image: High-quality action shot of PlayStation gaming environment, slightly darkened overlay for text contrast

### Live Fixtures Dashboard
- Section header: "Live Matches" with view count
- Horizontal scrolling carousel on mobile, 3-column grid on desktop
- Each fixture: Live badge, player info, game thumbnail, spectator count, "Watch & Bet" CTA
- Auto-refresh indicator

### Spectator Betting Section
- Active match details at top
- Live odds/predictions sidebar
- Betting slip component (sticky on scroll)
- Other spectator bets feed (anonymized)

### Match Result Confirmation
- Split-screen showing both players
- Winner declaration with trophy icon
- Payout breakdown
- "Play Again" and "View Stats" buttons

### Footer
- Multi-column: Company info, Quick Links, Legal, Contact
- Newsletter signup for match notifications
- Social links (PlayStation Network integration hint)
- Trust badges: "Secure Escrow System", "Fair Play Guaranteed"

### Icons
**Library:** Heroicons via CDN
- Wallet icons for different wallet types
- Trophy/medal icons for winners
- Controller icon for matches
- Eye icon for spectators
- Lock icon for escrow security

### Images
**Hero Image:** PlayStation controller close-up with gaming monitor in background, professional esports setup ambiance
**Game Thumbnails:** Official PlayStation game cover art (50-100px squares)
**Player Avatars:** Circular, 40-60px for cards, 80-100px for match details
**Empty States:** Custom illustrations for no active matches, empty wallets

### Animations
**Minimal & Strategic:**
- Live match indicator: subtle pulse animation
- Wallet balance updates: number counter animation
- Match creation: success checkmark animation
- Avoid excessive transitions; gaming UIs prioritize performance

### Accessibility
- ARIA labels for wallet balances and transaction amounts
- Keyboard navigation for match selection
- High contrast for bet amounts and balances
- Screen reader announcements for live match updates

This design creates an immersive, trustworthy gaming platform that balances excitement with clarity in financial transactions.