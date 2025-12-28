# Performance Remediation Plan v1.2: JS Payload & SEO

Continuing from Phase 1 & 2, we now focus on reducing initial JavaScript bundle size and improving technical SEO/Accessibility.

## Phase 3: JavaScript Payload Reduction

### 1. Route-Level Code Splitting
- [ ] Convert all non-critical route imports in `App.tsx` to `React.lazy`.
- [ ] Implement a `RouteProgress` indicator for lazy-loaded routes.
- [ ] Prioritize `LandingPage` and `CreatorDashboard` in the main bundle (or keep them non-lazy for now if they are the entry points).

### 2. Heavy Component Lazy Loading
- [ ] Identify components using `Three.js` (e.g., `Assistant3DScene`).
- [ ] Wrap these in `lazy` imports within their respective pages (`ChatPage`, `LandingPage`).
- [ ] Check `recharts` usage in `AdminDashboard` and `SuperAdminAnalytics`.

### 3. Icon Library Optimization
- [ ] Audit `lucide-react` imports to ensure tree-shaking is effective.

## Phase 4: Accessibility & SEO

### 1. SEO Fundamentals
- [ ] Add `robots.txt` to `public/`.
- [ ] Create `sitemap.xml` structure (or static file).
- [ ] Implement `Helmet` (or React 18+ title/meta tags) for dynamic page titles.

### 2. Image Accessibility
- [ ] Audit all `<img>` tags for descriptive `alt` text.
- [ ] Ensure decorative images have `alt=""`.

### 3. Semantic HTML
- [ ] Verify `h1`-`h6` hierarchy on main pages.
- [ ] Ensure all buttons have accessible labels (e.g., `aria-label` for icon-only buttons).

## Verification Plan
- [ ] Run `npm run build` and check chunk sizes.
- [ ] Use Lighthouse to measure "Total Blocking Time" (TBT) and "Cumulative Layout Shift" (CLS) improvements.
