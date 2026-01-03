# Conversation Cards UX Sandbox

## Overview
Conversation cards (Samtalskort) are a lightweight facilitation tool for:
- Facilitators (lead, pace, navigate)
- Participants (read, reflect, respond)

This sandbox explores how the cards should feel in use: as physical cards, not a generic modal or page.

## Design goals
- Card metaphor first: the UI should feel like a card deck.
- Drawer-first interaction: opening a card always uses a drawer.
- Clear orientation: users always know where they are in the collection.
- Low cognitive load: calm layout, readable typography, minimal controls.
- Safe tone: neutral, pedagogical, steady pacing.

## UI variants

### Variant A - Deck Drawer Minimal
Summary: A stacked deck preview with a bottom drawer that reveals the full card.
Pros:
- Strong physical deck feel.
- Simple controls, low noise.
- Works well for small groups.
Cons:
- Less room for metadata or side notes.
Best for: quick check-ins, warmups, short reflection rounds.

### Variant B - Side Drawer Library
Summary: Horizontal library preview with a right-side drawer for card reading.
Pros:
- Great for desktop facilitation.
- Easy to keep context and browse.
- Natural for facilitator control.
Cons:
- Side drawer can feel less "ritual" than bottom drawer.
Best for: facilitator-led workshops with larger collections.

### Variant C - Focus Drawer Full
Summary: Bottom drawer expanded to near-full height with immersive card view.
Pros:
- Strong focus on the prompt.
- Good for sensitive or longer reflection.
- Clear navigation and progress.
Cons:
- Less visible context outside the card.
Best for: deep reflection moments or longer prompts.

## Navigation and orientation
- Always show card index (e.g. 3 / 24) and a progress bar or dots.
- Provide prev/next actions and optional "View all" index.
- Support keyboard arrows and swipe (future enhancement).

## Open questions
- Should "Global" or "Tenant" collections be emphasized in user-facing view?
- How much facilitator guidance should be visible to participants?
- Is the deck interaction (draw/shuffle) required for MVP?
- Which drawer direction feels most natural for groups on tablets?

## Locations
- Sandbox UI: /sandbox/docs/conversation-cards
- Source: app/sandbox/docs/conversation-cards
