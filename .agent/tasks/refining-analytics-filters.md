# Task: Refining Analytics Filters

Refine the analytics system to support `user_tier` filtering (Creators vs. Business) in the main Analytics tab, ensuring consistency with the Asset Manager.

## 1. Backend: Update Enterprise Service
- [ ] Modify `GetSystemStats` in `internal/services/enterprise_service.go` to accept `userTier` string.
- [ ] Implement `roleFilter` logic based on `userTier`:
    - `creators`: `role NOT LIKE 'business%'`
    - `business`: `role LIKE 'business%'`
- [ ] Apply `roleFilter` to:
    - User Stats query.
    - Events Stats query.
    - Photos Stats query (via JOIN with `"user"`).
    - Tokens Stats query (via JOIN with `"user"`).
    - Events Summary query.
- [ ] Ensure SQL joins correctly handle the `"user"` table (Better Auth).

## 2. Backend: Update Admin Handlers
- [ ] Modify `GetSystemStats` in `internal/handlers/admin_handlers.go` to read `user_tier` query parameter.
- [ ] Pass the parameter to the service.

## 3. Frontend: Update Super Admin Analytics
- [ ] Add `filters` state with `user_tier: "creators"` to `SuperAdminAnalytics.tsx`.
- [ ] Update `fetchAnalytics` to append `?user_tier=${filters.user_tier}` to the API URL.
- [ ] Add a `Select` component to the header for switching between tiers (All, Creators, Business).
- [ ] Ensure the UI refreshes when the filter changes.

## 4. Verification
- [ ] Verify that selecting different tiers updates the counts and top events.
- [ ] Check for any SQL errors or mismatches.
