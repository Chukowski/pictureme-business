# Event Mode Logic & Album Tracking Validation

## Current State Analysis

### ✅ What's Working:
- Experience Mode selection updates `rules` correctly
- Album Tracking can be toggled independently
- Max Photos Per Album is configurable

### ❌ What's Missing:
- No validation between `eventMode` and `albumTracking.enabled`
- No automatic enabling/disabling of Album Tracking based on mode
- No warnings when incompatible configurations are selected

---

## Recommended Logic for Each Mode

### 1. **Free Experience**
```typescript
eventMode: 'free'
albumTracking.enabled: OPTIONAL (user choice)
rules: {
  leadCaptureEnabled: false,
  requirePaymentBeforeDownload: false,
  allowFreePreview: true
}
```

**User Journey:**
- **Without Tracking:** Take photo → Download directly
- **With Tracking:** Take photo → Scan QR → Personal album → Download

**Validation:** None required (both modes valid)

---

### 2. **Lead Capture**
```typescript
eventMode: 'lead_capture'
albumTracking.enabled: RECOMMENDED (should show warning if disabled)
rules: {
  leadCaptureEnabled: true,
  requirePaymentBeforeDownload: false,
  allowFreePreview: true
}
```

**User Journey:**
- Take photo → Scan QR → Enter email/phone → Album unlocked → Download

**Validation:** 
- ⚠️ Warning if `albumTracking.enabled = false`: "Lead Capture works best with Album Tracking enabled to associate emails with albums"

---

### 3. **Pay Per Photo**
```typescript
eventMode: 'pay_per_photo'
albumTracking.enabled: OPTIONAL (not required)
rules: {
  leadCaptureEnabled: true,
  requirePaymentBeforeDownload: true,
  allowFreePreview: true,
  hardWatermarkOnPreviews: true
}
```

**User Journey:**
- Take photo → See watermarked preview → Pay for individual photo → Download

**Validation:** None required (works with or without tracking)

---

### 4. **Pay Per Album**
```typescript
eventMode: 'pay_per_album'
albumTracking.enabled: REQUIRED (must be true)
rules: {
  leadCaptureEnabled: true,
  requirePaymentBeforeDownload: true,
  allowFreePreview: true,
  hardWatermarkOnPreviews: true
}
```

**User Journey:**
- Take photos → Scan QR → View album → Pay for full access → Download all

**Validation:**
- ❌ ERROR if `albumTracking.enabled = false`: "Pay Per Album requires Album Tracking to be enabled"
- Auto-enable `albumTracking.enabled = true` when this mode is selected

---

## Implementation Recommendations

### 1. Add Validation in EventSetup.tsx

```typescript
// When Pay Per Album is selected, auto-enable tracking
onClick={() => setFormData({
  ...formData,
  eventMode: 'pay_per_album',
  albumTracking: {
    ...formData.albumTracking,
    enabled: true  // Force enable
  },
  rules: { 
    ...formData.rules, 
    leadCaptureEnabled: true, 
    requirePaymentBeforeDownload: true, 
    allowFreePreview: true, 
    hardWatermarkOnPreviews: true 
  }
})}
```

### 2. Add Warning in EventWorkflow.tsx

```typescript
// Show warning if Lead Capture is enabled but tracking is disabled
{formData.eventMode === 'lead_capture' && !formData.albumTracking?.enabled && (
  <Alert variant="warning">
    <AlertTriangle className="w-4 h-4" />
    <AlertTitle>Album Tracking Recommended</AlertTitle>
    <AlertDescription>
      Lead Capture works best with Album Tracking enabled to associate emails with visitor albums.
    </AlertDescription>
  </Alert>
)}
```

### 3. Disable Toggle for Pay Per Album

```typescript
// In EventWorkflow.tsx, disable the tracking toggle if Pay Per Album is active
<Switch
  checked={formData.albumTracking?.enabled || false}
  onCheckedChange={(checked) => updateTracking({ enabled: checked })}
  disabled={formData.eventMode === 'pay_per_album'} // Can't disable
  className="data-[state=checked]:bg-indigo-600"
/>

{formData.eventMode === 'pay_per_album' && (
  <p className="text-xs text-amber-400 mt-1">
    ⚠️ Album Tracking is required for Pay Per Album mode
  </p>
)}
```

---

## Analytics & Stats Logic

### For Events WITH Album Tracking:
- Count albums in `albums` table
- Calculate completion based on `photo_count >= maxPhotosPerAlbum`
- Show visitors, completed albums, pending payment, etc.

### For Events WITHOUT Album Tracking:
- Count photos in `processed_photos` by `event_slug`
- Show total photos taken
- No album-level stats (since there are no albums)

**Current Issue:** Events without tracking show "0" for everything in Live Mode

**Solution:** Add fallback stats calculation:
```sql
-- If albumTracking.enabled = false, count from processed_photos
SELECT COUNT(*) as total_photos
FROM processed_photos
WHERE event_slug = $1 AND is_visible = TRUE
```

---

## Summary of Required Changes

1. ✅ **Auto-enable tracking** when "Pay Per Album" is selected
2. ⚠️ **Show warning** when "Lead Capture" is selected without tracking
3. 🔒 **Disable toggle** for Album Tracking when "Pay Per Album" is active
4. 📊 **Add fallback stats** for events without tracking (count photos from `processed_photos`)
5. 📝 **Update UI labels** to clarify when tracking is required vs. optional

---

## Testing Checklist

- [ ] Free Experience + No Tracking → Photos downloadable directly
- [ ] Free Experience + Tracking → QR codes work, albums created
- [ ] Lead Capture + No Tracking → Warning shown, still functional
- [ ] Lead Capture + Tracking → Email captured, album created
- [ ] Pay Per Photo + No Tracking → Individual payment works
- [ ] Pay Per Photo + Tracking → Payment + album works
- [ ] Pay Per Album + Tracking → Full album payment works
- [ ] Pay Per Album without Tracking → Should be impossible (auto-enabled)
