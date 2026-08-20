import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  // Save scroll position right before reload/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentY = window.scrollY || document.documentElement.scrollTop || 0;
      sessionStorage.setItem('finmate_pre_reload_y', currentY.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    // If there's no hash (e.g. #features), perform smooth animated scroll to top
    if (!hash) {
      const savedY = sessionStorage.getItem('finmate_pre_reload_y');
      sessionStorage.removeItem('finmate_pre_reload_y');

      const initialY = savedY ? parseFloat(savedY) : (window.scrollY || document.documentElement.scrollTop || 0);

      if (initialY > 30) {
        // Temporarily position scroll at initialY so animation starts smoothly from where user was
        window.scrollTo(0, initialY);
        document.documentElement.scrollTop = initialY;
        document.body.scrollTop = initialY;

        const timer = setTimeout(() => {
          if (window.lenis) {
            window.lenis.scrollTo(0, { duration: 1.6 });
          } else {
            const duration = 1400; // 1.4s smooth animation
            let startTime = null;

            const animateScroll = (currentTime) => {
              if (!startTime) startTime = currentTime;
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = easeOutCubic(progress);
              const nextY = initialY * (1 - ease);

              window.scrollTo(0, nextY);

              if (progress < 1) {
                requestAnimationFrame(animateScroll);
              }
            };

            requestAnimationFrame(animateScroll);
          }
        }, 60);

        return () => clearTimeout(timer);
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
