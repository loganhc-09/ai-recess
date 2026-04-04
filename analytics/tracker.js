// AI Recess — Attribution tracker with Google Sheets beacon
//
// How it works:
// 1. On page load: captures ref, UTM, referrer, page, timestamp
// 2. On CTA click: beacons attribution data to Google Sheet, then redirects
// 3. Google Sheet logs: timestamp, ref, cta, utm_campaign, referrer, page
// 4. The weekly report script (report.py) supplements with GitHub traffic API
//
// Setup: Deploy the Apps Script (see analytics/sheets-beacon-setup.md),
// then set SHEETS_BEACON_URL below.

(function() {
  // Replace with your deployed Apps Script URL (see sheets-beacon-setup.md)
  var SHEETS_BEACON_URL = 'https://script.google.com/macros/s/AKfycbx4LHZClIfVTMZfm-rCErib8apwO3N3E4-uYxO0nhMuHXLWY4fbUT0lLVy890Lv0Je4ZA/exec';

  var params = new URLSearchParams(window.location.search);

  var attribution = {
    ref: params.get('ref') || '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    referrer: document.referrer || 'direct',
    page: window.location.pathname
  };

  // Store attribution in session for cross-page persistence
  if (attribution.ref || attribution.utm_source || attribution.referrer !== 'direct') {
    try { sessionStorage.setItem('ar_attr', JSON.stringify(attribution)); } catch(e) {}
  }

  // Tag all Skool join links with attribution params
  document.querySelectorAll('.join-cta').forEach(function(link) {
    var href = link.getAttribute('href');
    if (!href || href.indexOf('skool.com') === -1) return;

    var url = new URL(href);
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('ar_attr') || '{}'); } catch(e) {}

    var ref = stored.ref || stored.utm_source || attribution.ref || '';
    var ctaLocation = link.getAttribute('data-cta') || 'unknown';

    if (ref) url.searchParams.set('ref', ref);
    url.searchParams.set('cta', ctaLocation);
    if (stored.utm_campaign) url.searchParams.set('utm_campaign', stored.utm_campaign);

    link.setAttribute('href', url.toString());
  });

  // Log CTA clicks — beacon to Google Sheet, then let redirect happen
  document.querySelectorAll('.join-cta').forEach(function(link) {
    link.addEventListener('click', function() {
      var stored = {};
      try { stored = JSON.parse(sessionStorage.getItem('ar_attr') || '{}'); } catch(e) {}

      var event = {
        type: 'cta_click',
        cta: link.getAttribute('data-cta') || 'unknown',
        ref: stored.ref || attribution.ref || '',
        utm_campaign: stored.utm_campaign || attribution.utm_campaign || '',
        referrer: stored.referrer || attribution.referrer || 'direct',
        page: window.location.pathname,
        ts: new Date().toISOString()
      };

      console.log('[AI Recess]', event.cta, '→', event.ref || 'organic');

      // Fire-and-forget GET request to Google Sheet (image pixel pattern)
      if (SHEETS_BEACON_URL) {
        var img = new Image();
        img.src = SHEETS_BEACON_URL +
          '?ref=' + encodeURIComponent(event.ref) +
          '&cta=' + encodeURIComponent(event.cta) +
          '&utm_campaign=' + encodeURIComponent(event.utm_campaign) +
          '&referrer=' + encodeURIComponent(event.referrer) +
          '&page=' + encodeURIComponent(event.page) +
          '&ts=' + encodeURIComponent(event.ts);
      }
    });
  });
})();
