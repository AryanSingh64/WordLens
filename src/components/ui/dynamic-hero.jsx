/**
 * dynamic-hero.jsx — HeroSection component for the WordLens landing page
 * 
 * Features:
 * - Animated dashed arrow that follows the mouse cursor and points
 *   to the CTA button — adds a subtle interactive delight
 * - Full-bleed preview image area with rounded "device frame" styling
 * - Responsive nav bar with muted links that highlight on hover
 * 
 * Ported from the provided TSX to JSX (no TypeScript).
 * All class names use Tailwind utilities mapped to our CSS variables.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

/* ─── Helpers ─── */

/** Parse an rgb/rgba colour string into {r, g, b} */
const parseRgbColor = (colorString) => {
    if (!colorString) return null;
    const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
        return {
            r: parseInt(match[1], 10),
            g: parseInt(match[2], 10),
            b: parseInt(match[3], 10),
        };
    }
    return null;
};

/** Default navigation items for the landing page */
const defaultNavItems = [
    { id: 'home', label: 'Home', onClick: () => { } },
    { id: 'how', label: 'How it works', href: '#how-it-works' },
    { id: 'pdf', label: 'PDF Reader', href: '#pdf-reader' },
    { id: 'get', label: 'Get Extension', onClick: () => { } },
];


const HeroSection = ({
    heading,
    tagline,
    buttonText,
    imageUrl,
    logo,
    headerRight,
    navItems = defaultNavItems,
}) => {
    const canvasRef = useRef(null);
    const targetRef = useRef(null);
    const mousePosRef = useRef({ x: null, y: null });
    const ctxRef = useRef(null);
    const animationFrameIdRef = useRef(null);

    /* Resolved colour for the arrow stroke — reads from CSS variable */
    const resolvedCanvasColorsRef = useRef({
        strokeStyle: { r: 128, g: 128, b: 128 },
    });

    /* Resolve --foreground colour from CSS variables on mount */
    useEffect(() => {
        const tempElement = document.createElement('div');
        tempElement.style.display = 'none';
        document.body.appendChild(tempElement);

        const updateResolvedColors = () => {
            tempElement.style.color = 'var(--foreground)';
            const computedFgColor = getComputedStyle(tempElement).color;
            const parsedFgColor = parseRgbColor(computedFgColor);
            if (parsedFgColor) {
                resolvedCanvasColorsRef.current.strokeStyle = parsedFgColor;
            }
        };

        updateResolvedColors();

        /* Watch for theme changes (future dark-mode support) */
        const observer = new MutationObserver(() => updateResolvedColors());
        observer.observe(document.documentElement, { attributes: true });

        return () => {
            observer.disconnect();
            if (tempElement.parentNode) tempElement.parentNode.removeChild(tempElement);
        };
    }, []);

    /**
     * Draw a dashed curved arrow from the mouse position to the CTA button.
     * Uses a quadratic bezier curve for a natural, organic feel.
     */
    const drawArrow = useCallback(() => {
        if (!canvasRef.current || !targetRef.current || !ctxRef.current) return;

        const targetEl = targetRef.current;
        const ctx = ctxRef.current;
        const mouse = mousePosRef.current;

        if (mouse.x === null || mouse.y === null) return;

        /* Calculate angle from mouse to button center */
        const rect = targetEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const a = Math.atan2(cy - mouse.y, cx - mouse.x);

        /* Arrow endpoint: slightly outside the button edge */
        const x1 = cx - Math.cos(a) * (rect.width / 2 + 12);
        const y1 = cy - Math.sin(a) * (rect.height / 2 + 12);

        /* Bezier control point for the curve */
        const midX = (mouse.x + x1) / 2;
        const midY = (mouse.y + y1) / 2;
        const offset = Math.min(200, Math.hypot(x1 - mouse.x, y1 - mouse.y) * 0.5);
        const t = Math.max(-1, Math.min(1, (mouse.y - y1) / 200));

        /* Fade out when mouse is close to the button */
        const r = Math.sqrt((x1 - mouse.x) ** 2 + (y1 - mouse.y) ** 2);
        const opacity = Math.min(1.0, (r - Math.max(rect.width, rect.height) / 2) / 500);

        const arrowColor = resolvedCanvasColorsRef.current.strokeStyle;
        ctx.strokeStyle = `rgba(${arrowColor.r}, ${arrowColor.g}, ${arrowColor.b}, ${opacity})`;
        ctx.lineWidth = 2;

        /* Draw the dashed curve */
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
        ctx.quadraticCurveTo(midX, midY + offset * t, x1, y1);
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.restore();

        /* Draw the arrowhead */
        const angle = Math.atan2(y1 - (midY + offset * t), x1 - midX);
        const headLength = 10 * (ctx.lineWidth / 1.5);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(
            x1 - headLength * Math.cos(angle - Math.PI / 6),
            y1 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x1, y1);
        ctx.lineTo(
            x1 - headLength * Math.cos(angle + Math.PI / 6),
            y1 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }, []);

    /* Set up canvas, mouse tracking, and animation loop */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !targetRef.current) return;

        ctxRef.current = canvas.getContext('2d');

        const updateCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e) => {
            mousePosRef.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('resize', updateCanvasSize);
        window.addEventListener('mousemove', handleMouseMove);
        updateCanvasSize();

        /* Animation loop — clears and redraws every frame */
        const animateLoop = () => {
            ctxRef.current?.clearRect(0, 0, canvas.width, canvas.height);
            drawArrow();
            animationFrameIdRef.current = requestAnimationFrame(animateLoop);
        };
        animateLoop();

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            window.removeEventListener('mousemove', handleMouseMove);
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [drawArrow]);

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
        >
            {/* ─── Navigation ─── */}
            <nav className="w-full max-w-5xl mx-auto flex justify-between items-center px-6 py-6 text-sm select-none z-20 relative">
                {logo}

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-2">
                        {navItems.map((item) => {
                            const cls =
                                'inline-block py-2 px-3 transition-colors duration-200 cursor-pointer text-muted hover:text-text';

                            if (item.href) {
                                return (
                                    <a key={item.id} href={item.href} className={cls}>
                                        {item.label}
                                    </a>
                                );
                            }
                            return (
                                <button key={item.id} type="button" onClick={item.onClick} className={cls}>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                    {headerRight}
                </div>
            </nav>


            {/* ─── Hero Content ─── */}
            <main className="flex-grow flex flex-col items-center justify-center">
                <div className="mt-12 sm:mt-16 lg:mt-24 flex flex-col items-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-center px-4 max-w-3xl leading-tight">
                        {typeof heading === 'string' && heading.endsWith('.') ? (
                            <>
                                {heading.slice(0, -1)}
                                <span className="text-[#ef4444]">.</span>
                            </>
                        ) : (
                            heading
                        )}
                    </h1>
                    <p
                        className="mt-3 text-center text-base sm:text-lg px-4 max-w-xl"
                        style={{ color: 'var(--muted)' }}
                    >
                        {tagline}
                    </p>
                </div>

                {/* ─── CTA Button (arrow target) ─── */}
                <div className="mt-8 flex justify-center">
                    <button
                        ref={targetRef}
                        className="py-2 px-4 rounded-xl transition-colors focus:outline-none"
                        style={{
                            border: '1px solid var(--text)',
                            color: 'var(--text)',
                            opacity: 0.7,
                        }}
                        onMouseEnter={(e) => (e.target.style.opacity = 1)}
                        onMouseLeave={(e) => (e.target.style.opacity = 0.7)}
                    >
                        {buttonText}
                    </button>
                </div>

                {/* ─── Preview Image ─── */}
                <div className="mt-16 w-full max-w-4xl mx-auto overflow-hidden px-4">
                    {/* The thick border wrapper matching the screenshot */}
                    <div
                        className="rounded-4xl p-2 shadow-xs "
                        style={{ backgroundColor: 'var(--border)' }}
                    >
                        <div
                            className="relative w-full aspect-video sm:aspect-21/9 rounded-3xl flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: 'var(--surface)' }}
                        >
                            {imageUrl && (
                                <img
                                    src={imageUrl}
                                    alt="WordLens preview — books on a desk"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            )}
                            {!imageUrl && (
                                <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                                    Preview
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom spacer */}
            <div className="h-12 sm:h-16 md:h-24"></div>

            {/* ─── Cursor-following arrow canvas ─── */}
            <canvas
                ref={canvasRef}
                className="fixed inset-0 pointer-events-none z-10"
            ></canvas>
        </div>
    );
};

export { HeroSection };
