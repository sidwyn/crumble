(() => {
  'use strict';

  // Known consent framework selectors for reject/decline buttons
  const REJECT_SELECTORS = [
    // OneTrust
    '#onetrust-reject-all-handler',
    '.onetrust-close-btn-handler[aria-label*="reject" i]',

    // CookieBot
    '#CybotCookiebotDialogBodyButtonDecline',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',

    // TrustArc
    '.truste-button2',
    '#truste-consent-required',

    // Quantcast (CMP2)
    '.qc-cmp2-summary-buttons button[mode="secondary"]',
    '[data-tracking-opt-in-reject]',

    // Didomi
    '#didomi-notice-disagree-button',
    '.didomi-continue-without-agreeing',

    // Complianz
    '.cmplz-deny',
    '.cmplz-btn.cmplz-deny',

    // CookieYes
    '.cky-btn-reject',
    '[data-cky-tag="reject-button"]',

    // Klaro
    '.klaro .cm-btn-decline',
    '.klaro button[data-type="decline"]',

    // Cookie Notice
    '.cookie-notice-container .cn-decline',

    // EU Cookie Law
    '.eupopup-button_2',

    // GDPR Cookie Consent
    '.gdpr-cookie-notice-reject',

    // Osano
    '.osano-cm-deny',

    // Termly
    '.t-declineAllButton',

    // Iubenda
    '.iubenda-cs-reject-btn',

    // Usercentrics
    '[data-testid="uc-deny-all-button"]',
    '#uc-btn-deny-banner',

    // Admiral
    '.admiral-close-btn'
  ];

  // Text patterns that indicate a reject/decline button
  const REJECT_TEXT_PATTERNS = [
    /^reject\s*(all)?$/i,
    /^decline\s*(all)?$/i,
    /^refuse\s*(all)?$/i,
    /^deny\s*(all)?$/i,
    /^(only\s+)?essential(s)?(\s+only)?$/i,
    /^(only\s+)?necessary(\s+only)?$/i,
    /^(only\s+)?required(\s+only)?$/i,
    /^use\s+(only\s+)?necessary/i,
    /^accept\s+(only\s+)?necessary/i,
    /^accept\s+(only\s+)?essential/i,
    /^continue\s+without\s+accepting/i,
    /^do\s+not\s+(consent|agree|accept)/i,
    /^disagree/i,
    /^no,?\s*thanks/i,
    /^opt[\s-]?out/i
  ];

  // Common cookie banner container selectors (to scope text search)
  const BANNER_SELECTORS = [
    '#onetrust-banner-sdk',
    '#CybotCookiebotDialog',
    '#truste-consent-content',
    '.qc-cmp2-container',
    '#didomi-popup',
    '.cmplz-cookiebanner',
    '.cky-consent-container',
    '.klaro',
    '.cookie-notice',
    '.cookie-consent',
    '.cookie-banner',
    '.gdpr-banner',
    '[class*="cookie-consent"]',
    '[class*="cookie-banner"]',
    '[class*="gdpr"]',
    '[id*="cookie-consent"]',
    '[id*="cookie-banner"]',
    '[id*="gdpr"]',
    '[aria-label*="cookie" i]',
    '[aria-label*="consent" i]',
    '[role="dialog"][aria-modal="true"]'
  ];

  let hasRejected = false;
  let checkCount = 0;
  const MAX_CHECKS = 50;

  function clickElement(element) {
    if (!element || hasRejected) return false;

    // Check if element is visible
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    if (rect.width === 0 || rect.height === 0 ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0') {
      return false;
    }

    try {
      element.click();
      hasRejected = true;
      notifyBackground();
      return true;
    } catch (e) {
      return false;
    }
  }

  function tryKnownSelectors() {
    for (const selector of REJECT_SELECTORS) {
      try {
        const element = document.querySelector(selector);
        if (element && clickElement(element)) {
          return true;
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return false;
  }

  function findBannerContainer() {
    for (const selector of BANNER_SELECTORS) {
      try {
        const container = document.querySelector(selector);
        if (container) {
          const rect = container.getBoundingClientRect();
          const style = window.getComputedStyle(container);
          if (rect.width > 0 && rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden') {
            return container;
          }
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    return null;
  }

  function tryTextBasedSearch() {
    const container = findBannerContainer() || document.body;

    // Find all buttons and clickable elements
    const clickables = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');

    for (const element of clickables) {
      const text = (element.textContent || element.value || '').trim();

      for (const pattern of REJECT_TEXT_PATTERNS) {
        if (pattern.test(text)) {
          if (clickElement(element)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function attemptReject() {
    if (hasRejected) return;

    checkCount++;
    if (checkCount > MAX_CHECKS) return;

    // Try known selectors first (fast path)
    if (tryKnownSelectors()) return;

    // Fall back to text-based search
    if (tryTextBasedSearch()) return;
  }

  function notifyBackground() {
    try {
      chrome.runtime.sendMessage({ type: 'COOKIE_REJECTED', url: window.location.href });
    } catch (e) {
      // Extension context may be invalidated
    }
  }

  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      if (hasRejected) {
        observer.disconnect();
        return;
      }

      // Check if any mutation added nodes that might be a cookie banner
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }

      if (shouldCheck) {
        // Debounce the check
        setTimeout(attemptReject, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Stop observing after 30 seconds to save resources
    setTimeout(() => observer.disconnect(), 30000);
  }

  function init() {
    // Initial check
    attemptReject();

    // Setup observer for late-loading banners (SPAs, lazy loading)
    if (document.body) {
      setupObserver();
    } else {
      document.addEventListener('DOMContentLoaded', setupObserver);
    }

    // Additional checks at key moments
    setTimeout(attemptReject, 500);
    setTimeout(attemptReject, 1000);
    setTimeout(attemptReject, 2000);
  }

  init();
})();
