# Task: Refactor Creator Dashboard

Refactor `CreatorDashboard.tsx` (1400+ lines) into a modular, maintainable structure by extracting components to a dedicated folder and moving logic to a custom hook.

## Status: 🔄 In Progress

## 📋 Objectives
- [ ] Extract data fetching and state logic to `useCreatorDashboard`.
- [ ] Create a dedicated folder: `src/components/dashboard/creator/`.
- [ ] Extract UI components:
    - `MarketplaceFeedCard`
    - `CreatorsGallerySection`
    - `HeroSection` / `HeroSectionCarousel`
    - `DashboardBentoGrid` (RecentCreations, TrendingTags, Challenges)
- [ ] Verify functionality and mobile responsiveness after each step.
- [ ] Maintain the "Premium" visual style implemented in previous steps.

## 🏗️ Proposed Architecture

### 1. Logic Layer
- `src/hooks/useCreatorDashboard.ts`: Handles all `useMemo`, `useEffect`, `useInfiniteScroll`, and API interactions.

### 2. Component Layer (`src/components/dashboard/creator/`)
- `MarketplaceFeedCard.tsx`: Individual creation tile.
- `CreatorsGallerySection.tsx`: Masonry grid container for the feed.
- `DashboardHero.tsx`: Featured spotlight carousel.
- `BentoCards/`:
    - `RecentCreationsCard.tsx`
    - `TrendingTagsCard.tsx`
    - `CommunityChallengeCard.tsx`
- `FeedControls.tsx`: Header with title and "See all" button.

### 3. Page Layer
- `src/pages/creator/CreatorDashboard.tsx`: Clean entry point orchesrating the above.

---

## 📅 Roadmap

### Phase 1: Preparation & Hook Extraction 🟢
1. Create directory structure.
2. Draft `useCreatorDashboard.ts` based on current logic.
3. Update `CreatorDashboard.tsx` to use the hook (Phase 1 verified if no UI changes).

### Phase 2: Feed Refactoring 🟡
1. Extract `MarketplaceFeedCard` and `CreatorsGallerySection`.
2. Move helper functions like `getMediaFeedUrl` to appropriate utils or keep in component.

### Phase 3: Hero & Bento Refactoring 🟡
1. Extract carousel and spotlight logic.
2. Extract the bottom bento grid cards.

### Phase 4: Verification 🔴
1. Run `checklist.py`.
2. Check mobile layout consistency.
3. Clean up the main dashboard file.

---

## ✅ Completed Tasks
- [x] Initial plan created.
