import React, { useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import './CustomCursor.css';

/**
 * ROOT CAUSE (identified in index.css line 43):
 *   html { zoom: 0.9 } at desktop breakpoints
 *
 * CSS `zoom` scales the entire layout coordinate system.
 * - position:fixed elements are positioned in ZOOMED CSS pixels
 * - mousemove clientX/clientY are in REAL (unzoomed) CSS pixels
 * - Result: at zoom:0.9, the cursor appears at 90% of the intended position
 *   causing it to stop before reaching the right/bottom edges of the screen
 *
 * FIX: divide clientX/Y by the zoom factor before applying to translate3d.
 * Also use createPortal so cursor renders in document.body with no
 * transformed ancestors (Lenis applies transforms to html/body scroll wrapper).
 */

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

        // Read the actual CSS zoom applied to html element.
        // At desktop: zoom=0.9. clientX/Y are unzoomed, so divide to convert.
        const getZoom = () =>
            parseFloat(getComputedStyle(document.documentElement).zoom) || 1;

        const updateHidden = (clientX, clientY) => {
            const el = document.elementFromPoint(clientX, clientY);
            isHidden.current = !!(el && el.closest(interactiveSelector));
        };

        // rawX/rawY are real CSS pixels from mousemove.
        // Divide by zoom to convert to the zoomed coordinate system used by position:fixed.
        const applyMainCursor = (rawX, rawY) => {
            const el = cursorRef.current;
            if (!el) return;
            const z = getZoom();
            const x = rawX / z;
            const y = rawY / z;
            el.style.transform = `translate3d(${x - 10}px, ${y - 10}px, 0)`;
            el.style.opacity = isHidden.current ? '0' : '1';
        };

        const tick = (now) => {
            const rawDt = (now - lastTs.current) / 1000;
            const dt = Math.min(Math.max(rawDt, 1 / 500), 0.064);
            lastTs.current = now;

            const lambdaBase = 15;
            const lambdaStep = 2.1;

            // Main ring: snap directly to zoom-corrected mouse position
            applyMainCursor(mouse.current.x, mouse.current.y);

            // Trail dots: work in zoomed pixel space (already divided)
            const z = getZoom();
            let prevX = mouse.current.x / z;
            let prevY = mouse.current.y / z;

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
            const z2 = getZoom();
            const mx = mouse.current.x / z2;
            const my = mouse.current.y / z2;
            if (Math.abs(trails.current[0].x - mx) > 0.1 || Math.abs(trails.current[0].y - my) > 0.1) {
                moving = true;
            } else {
                for (let i = 1; i < TRAIL_DOT_COUNT; i++) {
                    const t = trails.current[i];
                    const prev = trails.current[i - 1];
                    if (Math.abs(t.x - prev.x) > 0.1 || Math.abs(t.y - prev.y) > 0.1) {
                        moving = true;
                        break;
                    }
                }
            }

            rafId.current = moving ? requestAnimationFrame(tick) : null;
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
            // Snap ring immediately on every mousemove — zero lag
            applyMainCursor(e.clientX, e.clientY);
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

    // Portal directly into document.body — no transformed ancestor
    return createPortal(
        <div className="custom-cursor-wrapper">
            {Array.from({ length: TRAIL_DOT_COUNT }, (_, i) => (
                <div
                    key={i}
                    ref={(el) => { trailRefs.current[i] = el; }}
                    className="cursor-trail"
                    style={{ zIndex: 109 - i }}
                />
            ))}
            <div
                ref={cursorRef}
                className="cursor-main"
                style={{ zIndex: 110 }}
            />
        </div>,
        document.body
    );
});

export default CustomCursor;
