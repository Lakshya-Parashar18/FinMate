import React, { useEffect, useRef, memo } from 'react';
import './CustomCursor.css';

/** Trail dots behind the main ring (each follows the previous point in the chain). */
const TRAIL_DOT_COUNT = 5;

const CustomCursor = memo(() => {
    const cursorRef = useRef(null);
    const trailRefs = useRef([]);
    const mouse = useRef({ x: 0, y: 0 });
    const trails = useRef(
        Array.from({ length: TRAIL_DOT_COUNT }, () => ({ x: 0, y: 0 }))
    );
    const isHidden = useRef(false);
    const rafId = useRef(null);
    const lastTs = useRef(0);

    useEffect(() => {
        const interactiveSelector = 'a, button, [role="button"], input, select, textarea, iframe, .google-login-container';

        const updateHidden = (clientX, clientY) => {
            const el = document.elementFromPoint(clientX, clientY);
            isHidden.current = !!(el && el.closest(interactiveSelector));
        };

        const applyMainCursor = (x, y) => {
            const el = cursorRef.current;
            if (!el) return;
            el.style.transform = `translate3d(${x - 10}px, ${y - 10}px, 0)`;
            el.style.opacity = isHidden.current ? '0' : '1';
        };

        const tick = (now) => {
            const rawDt = (now - lastTs.current) / 1000;
            const dt = Math.min(Math.max(rawDt, 1 / 500), 0.064);
            lastTs.current = now;

            // Staggered exponential follow: front dots track the path tightly, tail eases out smoothly
            const lambdaBase = 15; // Slightly lower for more fluid lead
            const lambdaStep = 2.1;

            let prevX = mouse.current.x;
            let prevY = mouse.current.y;

            // Smoothly lerp the main cursor ring instead of instant follow
            const mainCursorKi = 1 - Math.exp(-25 * dt); // Faster than trails but still smooth
            const curMainX = trails.current[0] ? trails.current[0].x : mouse.current.x; // Use trail[0] as a proxy or track separate
            
            // Re-introducing independent main cursor tracking
            if (!trails.current.main) trails.current.main = { x: mouse.current.x, y: mouse.current.y };
            const m = trails.current.main;
            m.x += (mouse.current.x - m.x) * mainCursorKi;
            m.y += (mouse.current.y - m.y) * mainCursorKi;
            applyMainCursor(m.x, m.y);

            prevX = m.x;
            prevY = m.y;

            for (let i = 0; i < TRAIL_DOT_COUNT; i++) {
                const trail = trails.current[i];
                const lambda = lambdaBase - i * lambdaStep;
                const ki = 1 - Math.exp(-lambda * dt);
                trail.x += (prevX - trail.x) * ki;
                trail.y += (prevY - trail.y) * ki;

                const trailEl = trailRefs.current[i];
                if (trailEl) {
                    const scale = 1 - i * 0.07;
                    trailEl.style.transform = `translate3d(${trail.x - 5}px, ${trail.y - 5}px, 0) scale(${scale})`;
                    trailEl.style.opacity = isHidden.current
                        ? '0'
                        : String(0.6 - i * 0.08);
                }

                prevX = trail.x;
                prevY = trail.y;
            }

            let moving = false;
            // Use the main tracker for the moving check
            if (Math.abs(trails.current.main.x - mouse.current.x) > 0.1 || Math.abs(trails.current.main.y - mouse.current.y) > 0.1) {
                moving = true;
            } else {
                for (let i = 0; i < TRAIL_DOT_COUNT; i++) {
                    const t = trails.current[i];
                    if (Math.abs(t.x - (i === 0 ? trails.current.main.x : trails.current[i-1].x)) > 0.1) {
                        moving = true;
                        break;
                    }
                }
            }

            if (moving) {
                rafId.current = requestAnimationFrame(tick);
            } else {
                rafId.current = null;
            }
        };

        const ensureTick = () => {
            if (rafId.current == null) {
                lastTs.current = performance.now();
                rafId.current = requestAnimationFrame(tick);
            }
        };

        const handleMouseMove = (e) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
            updateHidden(e.clientX, e.clientY);
            // applyMainCursor is now handled in the tick loop for smoothness
            ensureTick();
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (rafId.current != null) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };
    }, []);

    return (
        <div className="custom-cursor-wrapper">
            {Array.from({ length: TRAIL_DOT_COUNT }, (_, i) => (
                <div
                    key={i}
                    ref={(el) => {
                        trailRefs.current[i] = el;
                    }}
                    className="cursor-trail"
                    style={{ zIndex: 109 - i }}
                />
            ))}
            <div
                ref={cursorRef}
                className="cursor-main"
                style={{ zIndex: 110 }}
            />
        </div>
    );
});

export default CustomCursor;
