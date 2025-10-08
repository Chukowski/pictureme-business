# Testing Checklist - Photo Booth AI Demo

Use this checklist to verify everything is working correctly.

## 📋 Pre-Testing Setup

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with valid `VITE_FAL_KEY`
- [ ] Development server running (`npm run dev`)
- [ ] Accessing via `http://localhost:8080`
- [ ] Camera-enabled device available

---

## 🎬 Test 1: Background Selection

**Steps:**
1. Open http://localhost:8080
2. Verify 5 background options are displayed
3. Click on each background
4. Verify preview appears with description

**Expected Results:**
- [ ] All 5 backgrounds load correctly
- [ ] Preview shows when background selected
- [ ] "Start Photo Booth" button appears
- [ ] Background names are visible

---

## 📷 Test 2: Camera Permissions

**Steps:**
1. Select a background
2. Click "Start Photo Booth"
3. Browser should prompt for camera permission
4. Allow camera access

**Expected Results:**
- [ ] Camera permission prompt appears
- [ ] Camera feed starts after allowing
- [ ] Video is visible and not frozen
- [ ] Camera selector shows if multiple cameras available

**Debug:**
- [ ] Click ℹ️ button in top-right
- [ ] Verify "Secure Context: ✅ Yes"
- [ ] Verify "Permission: granted"
- [ ] Verify "Camera Ready: ✅"

---

## 📸 Test 3: Photo Capture

**Steps:**
1. With camera running, click the camera button
2. Wait for countdown (3-2-1)
3. Photo should capture automatically

**Expected Results:**
- [ ] Countdown displays (3, 2, 1)
- [ ] Photo captures at 0
- [ ] Transitions to processing screen

---

## 🤖 Test 4: AI Processing

**Steps:**
1. After capture, processing screen should appear
2. Wait for AI to process (10-20 seconds)
3. Watch for status messages

**Expected Results:**
- [ ] "Creating Magic" title appears
- [ ] Status updates (e.g., "AI is working its magic...")
- [ ] Processing completes without errors
- [ ] Transitions to result screen

**Check Console:**
- [ ] Look for "🤖 Starting AI processing..."
- [ ] Look for "✅ AI processing complete"
- [ ] No red error messages

**If Errors:**
- [ ] Check `.env` has correct `VITE_FAL_KEY`
- [ ] Check console for specific error message
- [ ] Verify API key is valid at https://fal.ai/dashboard/keys

---

## 🎨 Test 5: Result Display

**Steps:**
1. After processing, result screen should show
2. Verify all elements are present

**Expected Results:**
- [ ] Processed photo displays with AI background
- [ ] QR code is generated and visible
- [ ] Share code is displayed (6 characters)
- [ ] Download button works
- [ ] Copy link button works
- [ ] "New Photo" button works

---

## 📱 Test 6: QR Code & Sharing

**Steps:**
1. On result screen, note the share code
2. Copy the link using "Copy Link" button
3. Scan QR code with phone (or open copied link)

**Expected Results:**
- [ ] QR code scannable
- [ ] Link copied to clipboard
- [ ] Opening link shows shared photo page
- [ ] Share page displays photo correctly
- [ ] Download works from share page

**Share URL Format:**
```
http://localhost:8080/share/ABC123
```
(Replace ABC123 with actual share code)

---

## 💾 Test 7: Local Storage

**Steps:**
1. Take multiple photos (2-3)
2. Open browser DevTools (F12)
3. Go to Application → Local Storage → http://localhost:8080
4. Check `photobooth_photos` key

**Expected Results:**
- [ ] `photobooth_photos` key exists
- [ ] Array of photos stored
- [ ] Each photo has all required fields:
  - `id`
  - `originalImageBase64`
  - `processedImageBase64`
  - `backgroundId`
  - `backgroundName`
  - `shareCode`
  - `createdAt`
  - `prompt`

**Check Storage:**
```javascript
// In browser console:
const photos = JSON.parse(localStorage.getItem('photobooth_photos'));
console.log('Photos:', photos.length);
console.log('Storage:', new Blob([localStorage.getItem('photobooth_photos')]).size, 'bytes');
```

---

## 🔄 Test 8: End-to-End Flow

**Complete Flow:**
1. [ ] Open app
2. [ ] Select background
3. [ ] Allow camera
4. [ ] Capture photo
5. [ ] AI processes successfully
6. [ ] View result
7. [ ] Download photo
8. [ ] Copy share link
9. [ ] Open share link in new tab
10. [ ] View shared photo
11. [ ] Click "New Photo"
12. [ ] Back to background selection

---

## 🎯 Test 9: Different Backgrounds

Test each background individually:
- [ ] Particle Field (orange glowing particles)
- [ ] Jungle Depths (teal jungle)
- [ ] Underwater (bubbles)
- [ ] Rain Storm (rainfall)
- [ ] Nature Bokeh (leaves with bokeh)

**For each:**
- [ ] Background applies correctly
- [ ] AI compositing looks natural
- [ ] Person is well-integrated

---

## 🌐 Test 10: Different Browsers

Test on multiple browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] iPad Safari (primary target)

**For each:**
- [ ] Camera works
- [ ] UI displays correctly
- [ ] AI processing works
- [ ] QR codes display
- [ ] localStorage works

---

## ⚡ Test 11: Performance

**Metrics to Check:**
- [ ] Background selection: instant
- [ ] Camera start: < 3 seconds
- [ ] Photo capture: instant
- [ ] AI processing: 5-20 seconds (acceptable)
- [ ] Result display: < 2 seconds
- [ ] QR generation: instant

**Console Performance:**
```javascript
// Check localStorage size:
const size = new Blob([localStorage.getItem('photobooth_photos')]).size;
console.log('Storage used:', (size / 1024 / 1024).toFixed(2), 'MB');
```

---

## 🐛 Test 12: Error Handling

### Camera Denied
- [ ] Deny camera permission
- [ ] Error message appears
- [ ] "Retry Camera Access" button works

### No Camera
- [ ] Disconnect/disable camera (if possible)
- [ ] Appropriate error message

### AI Failure
- [ ] Use invalid API key
- [ ] Error message appears
- [ ] Fallback to original photo works

### Storage Full
- [ ] Fill localStorage (take many photos)
- [ ] Old photos automatically removed

---

## 📱 Test 13: iPad Specific

**On actual iPad:**
- [ ] UI scales properly
- [ ] Touch targets are large enough
- [ ] Camera switches (front/back) work
- [ ] Portrait/landscape orientation works
- [ ] QR code size appropriate
- [ ] Text is readable
- [ ] Buttons are easily tappable

---

## 🐳 Test 14: Docker (Optional)

**If testing Docker deployment:**
```bash
docker build -t ai-photo-booth-hub .
docker run -p 8080:80 ai-photo-booth-hub
```

- [ ] Docker builds successfully
- [ ] Container starts
- [ ] Health check passes
- [ ] App accessible at http://localhost:8080
- [ ] Camera works (only via localhost)

---

## ✅ Final Checklist

**All Systems Go:**
- [ ] Camera works reliably
- [ ] AI processing completes
- [ ] Photos save to localStorage
- [ ] QR codes work
- [ ] Share links work
- [ ] UI is responsive
- [ ] No console errors
- [ ] Performance is acceptable

**Documentation Complete:**
- [ ] README.md updated
- [ ] DEMO_SETUP.md reviewed
- [ ] CAMERA_SETUP.md reviewed
- [ ] .env configured

---

## 🆘 Common Issues

### Camera not showing
→ Check CAMERA_SETUP.md
→ Verify HTTPS or localhost
→ Check browser permissions

### AI fails
→ Verify VITE_FAL_KEY in .env
→ Check API key validity
→ Check internet connection

### QR code not working
→ Ensure accessing same host
→ Check share link format
→ Verify photo in localStorage

### Slow performance
→ Try Gemini model (faster)
→ Check network speed
→ Clear old photos from localStorage

---

## 📊 Success Criteria

**Demo is Ready When:**
- ✅ End-to-end flow works smoothly
- ✅ Camera captures reliably
- ✅ AI processing succeeds consistently
- ✅ QR codes are shareable
- ✅ Performance is acceptable (<30s total)
- ✅ UI looks professional
- ✅ No critical bugs

**Ready for Production When:**
- Backend implemented (IMPLEMENTATION_PLAN.md)
- HTTPS configured properly
- Email integration complete
- Analytics added
- Tested on target iPad devices

---

## 🎉 Testing Complete!

If all tests pass, your Photo Booth AI demo is ready to use! 🚀📸

