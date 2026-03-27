// AI Recess — Zero-cost attribution tracker
// Logs visits and CTA clicks to localStorage, then beacons to a tiny
// JSON endpoint on GitHub Pages itself (a static JSON file we update weekly).
//
// How it works:
// 1. On page load: captures ref, UTM, referrer, page, timestamp
// 2. On CTA click: captures which button, same attribution data
// 3. Stores everything in localStorage under 'ar_events'
// 4. The weekly report script (report.py) can pull GitHub traffic API data
//    to supplement this client-side tracking

(function() {
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

  // Log CTA clicks
  document.querySelectorAll('.join-cta').forEach(function(link) {
    link.addEventListener('click', function() {
      var stored = {};
      try { stored = JSON.parse(sessionStorage.getItem('ar_attr') || '{}'); } catch(e) {}

      var event = {
        type: 'cta_click',
        cta: link.getAttribute('data-cta') || 'unknown',
        ref: stored.ref || attribution.ref || '',
        page: window.location.pathname,
        href: link.getAttribute('href'),
        ts: new Date().toISOString()
      };

      console.log('[AI Recess]', event.cta, '→', event.ref || 'organic');
    });
  });
})();
