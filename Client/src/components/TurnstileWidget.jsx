import React, { useEffect, useRef } from 'react';

export default function TurnstileWidget({ onVerify, siteKey }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Fallback to Cloudflare's official "Always Passes" testing key if not provided
  const activeSiteKey = siteKey || import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    let active = true;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) return;

      try {
        // If there's an existing widget rendered, remove it first
        if (widgetIdRef.current !== null) {
          window.turnstile.remove(widgetIdRef.current);
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: activeSiteKey,
          theme: 'dark', // Renders beautifully within our dark UI
          callback: (token) => {
            if (active) onVerify(token);
          },
          'expired-callback': () => {
            if (active) onVerify(null);
          },
          'error-callback': () => {
            if (active) onVerify(null);
          },
        });
      } catch (err) {
        console.error('Error rendering Turnstile:', err);
      }
    };

    // If script isn't loaded yet, wait for it
    if (window.turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 500);

      return () => {
        clearInterval(interval);
        active = false;
        if (widgetIdRef.current !== null && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (e) {}
        }
      };
    }

    return () => {
      active = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
      }
    };
  }, [onVerify, activeSiteKey]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
      <div ref={containerRef}></div>
    </div>
  );
}
