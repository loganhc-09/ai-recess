// AI Recess — Attribution tracker
//
// Captures who sent a visitor (ref / UTM / referrer) and, when they click a
// join CTA, (1) appends that attribution to the LaunchPass join URL and
// (2) fires a GA4 `join_click` event so the conversion shows up in Google
// Analytics (property G-8CQ7JES2VT) right alongside traffic.
//
// History: this used to beacon to a Google Apps Script → Google Sheet, but
// that deployment 403'd ("You need access") and logged nothing. GA4 is the
// source of truth for traffic anyway, so attribution now lives there too.
// No separate endpoint to deploy, authorize, or watch rot.

(function () {
  // CTA links start as href="#join"; an inline script in index.html rewrites
  // them to JOIN_URL (LaunchPass). We read the href at CLICK time so we don't
  // depend on which script ran first.

  var params = new URLSearchParams(window.location.search);

  var attribution = {
    ref: params.get('ref') || '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    referrer: document.referrer || 'direct',
    landing: window.location.pathname
  };

  // Persist first-touch attribution for the session so it survives in-site
  // navigation (don't overwrite an existing ref with a later blank one).
  var stored = {};
  try { stored = JSON.parse(sessionStorage.getItem('ar_attr') || '{}'); } catch (e) {}
  if (attribution.ref || attribution.utm_source || attribution.referrer !== 'direct') {
    var merged = {};
    Object.keys(attribution).forEach(function (k) {
      merged[k] = attribution[k] || stored[k] || '';
    });
    try { sessionStorage.setItem('ar_attr', JSON.stringify(merged)); } catch (e) {}
    stored = merged;
  }

  function attr(key) {
    return stored[key] || attribution[key] || '';
  }

  // Append attribution params to an outbound http(s) join URL so the
  // destination (LaunchPass / Stripe) carries it too. Leaves #anchors alone.
  function tagJoinUrl(href, ctaLocation) {
    if (!href || href.charAt(0) === '#') return href;
    var url;
    try { url = new URL(href, window.location.origin); } catch (e) { return href; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return href;

    var ref = attr('ref') || attr('utm_source');
    if (ref) url.searchParams.set('ref', ref);
    if (ctaLocation) url.searchParams.set('cta', ctaLocation);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
      if (attr(k)) url.searchParams.set(k, attr(k));
    });
    return url.toString();
  }

  document.querySelectorAll('.join-cta').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var ctaLocation = link.getAttribute('data-cta') || 'unknown';
      var dest = tagJoinUrl(link.getAttribute('href'), ctaLocation);

      var payload = {
        ref: attr('ref') || 'organic',
        cta_location: ctaLocation,
        utm_campaign: attr('utm_campaign'),
        page_referrer: attr('referrer'),
        destination: dest
      };
      console.log('[AI Recess] join_click', payload);

      // Fire GA4 event. sendBeacon transport survives the navigation, so we
      // don't need to delay the redirect. If gtag is blocked/missing, we just
      // fall through to normal navigation.
      if (typeof window.gtag === 'function') {
        try { window.gtag('event', 'join_click', payload); } catch (err) {}
      }

      // If we rewrote the destination (added attribution), navigate there
      // ourselves; otherwise let the link's own href handle it.
      if (dest && dest !== link.getAttribute('href') && dest.charAt(0) !== '#') {
        e.preventDefault();
        window.location.href = dest;
      }
    });
  });
})();
