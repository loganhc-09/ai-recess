# Google Sheets Attribution Beacon — Setup Guide

Logs every CTA click from joinairecess.com to a Google Sheet with attribution data (who referred them, which button, when).

## Step 1: Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new sheet
2. Name it **AI Recess — CTA Clicks**
3. Add these headers in Row 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Ref | CTA | UTM Campaign | Referrer | Page |

## Step 2: Add the Apps Script

1. In the sheet, go to **Extensions > Apps Script**
2. Delete any existing code and paste:

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter;

  sheet.appendRow([
    params.ts || new Date().toISOString(),
    params.ref || '',
    params.cta || '',
    params.utm_campaign || '',
    params.referrer || '',
    params.page || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Save (Ctrl+S)

## Step 3: Deploy as Web App

1. Click **Deploy > New deployment**
2. Click the gear icon, select **Web app**
3. Set:
   - Description: `AI Recess CTA beacon`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Authorize when prompted (review permissions, allow)
6. Copy the **Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

## Step 4: Add the URL to tracker.js

Open `analytics/tracker.js` and set the URL:

```javascript
var SHEETS_BEACON_URL = 'https://script.google.com/macros/s/YOUR_ID_HERE/exec';
```

## Step 5: Test

1. Visit `joinairecess.com?ref=test-logan`
2. Click any join CTA
3. Check your Google Sheet — a new row should appear within seconds

## What Gets Logged

Every CTA click records:
- **Timestamp** — when they clicked
- **Ref** — which creator sent them (logan-tiktok, kevin-tiktok, v-tiktok, etc.)
- **CTA** — which button they clicked (hero, pricing, etc.)
- **UTM Campaign** — if a specific campaign was tagged
- **Referrer** — where they came from before the site
- **Page** — which page they were on

## Matching to Skool Signups

When you get a Skool payment email for a new member:
1. Note the signup time
2. Check the Google Sheet for CTA clicks in the ~5 min before
3. The `ref` column tells you whose content brought them in

This is manual for now but gives you real attribution data. If volume grows, you can automate the cross-reference.
