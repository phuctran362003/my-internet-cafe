/**
 * Mobile-specific UI handling for responsive design
 */

export function initMobileUI() {
  const drawer = document.querySelector('.drawer');
  const dock = document.querySelector('.dock');
  
  if (!drawer) return;

  // Check if device is mobile (max-width: 480px)
  const isMobile = window.innerWidth <= 480;
  
  if (!isMobile) return;

  // Store original drawer state
  let drawerWasVisible = false;

  // Handle drawer toggle on mobile
  // Dock buttons should toggle drawer visibility on mobile
  if (dock) {
    dock.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        // Close drawer when clicking dock buttons on mobile
        closeDrawerOnMobile();
      }
    });
  }

  // Handle viewport changes (orientation change, resize)
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      handleViewportChange();
    }, 100);
  });

  window.addEventListener('resize', debounce(() => {
    handleViewportChange();
  }, 250));

  function handleViewportChange() {
    const isNowMobile = window.innerWidth <= 480;
    
    if (isNowMobile && drawerWasVisible) {
      drawer.classList.add('active');
    } else if (!isNowMobile) {
      drawer.classList.remove('active');
      drawerWasVisible = drawer.classList.contains('active');
    }
  }

  function closeDrawerOnMobile() {
    if (isMobileViewport()) {
      drawer.classList.remove('active');
      drawerWasVisible = false;
    }
  }

  function isMobileViewport() {
    return window.innerWidth <= 480;
  }
}

/**
 * Simple debounce helper
 */
function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Setup mobile viewport height fix for address bar
 * This addresses the 100vh issue on mobile browsers
 */
export function fixMobileViewportHeight() {
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setViewportHeight();
  window.addEventListener('resize', debounce(setViewportHeight, 250));
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
  });
}

/**
 * Detect if device is touch-capable
 */
export function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0)
  );
}

/**
 * Prevent double-tap zoom on buttons (improves performance)
 */
export function disableDoubleTapZoom() {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}
