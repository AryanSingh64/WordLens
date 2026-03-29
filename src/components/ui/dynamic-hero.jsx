/**
 * dynamic-hero.jsx — HeroSection component for the WordLens landing page
 *
 * Features:
 * - Animated dashed arrow that follows the mouse cursor and points
 *   to the CTA button — adds a subtle interactive delight
 * - Full-bleed preview image area with rounded "device frame" styling
 * - Responsive nav bar with muted links that highlight on hover
 * - IMMERSIVE SCROLL EXPERIENCE: Parallax layers, scroll-triggered reveals,
 *   cinematic transitions, and smooth scroll-driven animations
 *
 * Ported from the provided TSX to JSX (no TypeScript).
 * All class names use Tailwind utilities mapped to our CSS variables.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useVelocity, useMotionValue } from 'framer-motion';

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
    ctaAction,
}) => {
    const canvasRef = useRef(null);
    const targetRef = useRef(null);
    const mousePosRef = useRef({ x: null, y: null });
    const ctxRef = useRef(null);
    const animationFrameIdRef = useRef(null);

    // Scroll-based animations with Framer Motion
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const smoothScrollY = useSpring(scrollY, { damping: 30, stiffness: 200 });

    // Parallax transforms for different layers
    const parallaxY = useTransform(smoothScrollY, [0, 1000], [0, -300]);
    const imageScale = useTransform(smoothScrollY, [0, 800], [1, 1.15]);
    const imageOpacity = useTransform(smoothScrollY, [0, 600], [1, 0.7]);
    const navY = useTransform(smoothScrollY, [0, 300], [0, -20]);
    const contentY = useTransform(smoothScrollY, [0, 800], [0, -150]);
    const textOpacity = useTransform(scrollY, [100, 300], [1, 0]);

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
     * Draw a beautiful dashed curved arrow from the mouse position to the CTA button.
     * Optimized for performance.
     */
    const drawArrow = useCallback(() => {
        if (!canvasRef.current || !targetRef.current || !ctxRef.current) return;

        const targetEl = targetRef.current;
        const ctx = ctxRef.current;
        const mouse = mousePosRef.current;

        if (mouse.x === null || mouse.y === null) return;

        /* Get cached accent color (computed once on mount) */
        const accentRgb = resolvedCanvasColorsRef.current.strokeStyle;

        /* Calculate angle from mouse to button center */
        const rect = targetEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const a = Math.atan2(cy - mouse.y, cx - mouse.x);

        /* Arrow endpoint: slightly outside the button edge */
        const padding = 16;
        const x1 = cx - Math.cos(a) * (rect.width / 2 + padding);
        const y1 = cy - Math.sin(a) * (rect.height / 2 + padding);

        /* Bezier control point for the curve - creates a gentle arc */
        const midX = (mouse.x + x1) / 2;
        const midY = (mouse.y + y1) / 2;
        const distance = Math.hypot(x1 - mouse.x, y1 - mouse.y);
        const offset = Math.min(100, distance * 0.2); // Reduced for performance
        const t = Math.max(-1, Math.min(1, (mouse.y - y1) / 200));

        /* Fade out when mouse is close to the button */
        const r = Math.sqrt((x1 - mouse.x) ** 2 + (y1 - mouse.y) ** 2);
        const minDistance = Math.max(rect.width, rect.height);
        const opacity = Math.max(0, Math.min(1, (r - minDistance) / 400));

        /* Draw with solid color for better performance */
        ctx.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${opacity * 0.6})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        /* Draw the dashed curved line */
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);

        const controlX = midX;
        const controlY = midY + offset * t;
        ctx.quadraticCurveTo(controlX, controlY, x1, y1);

        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.restore();

        /* Draw the arrowhead only if visible */
        if (opacity > 0.2) {
            const angle = Math.atan2(y1 - controlY, x1 - controlX);
            const headLength = 12;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(
                x1 - headLength * Math.cos(angle - Math.PI / 6),
                y1 - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                x1 - headLength * Math.cos(angle + Math.PI / 6),
                y1 - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${opacity})`;
            ctx.fill();
            ctx.restore();
        }
    }, []);

    /* Set up canvas, mouse tracking, and animation loop */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !targetRef.current) return;

        ctxRef.current = canvas.getContext('2d', { alpha: true });

        const updateCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        let lastMouseX = 0, lastMouseY = 0;
        let needsRedraw = false;

        const handleMouseMove = (e) => {
            const { x, y } = e;
            // Only trigger redraw if mouse moved more than 5px (reduces unnecessary draws)
            if (Math.abs(x - lastMouseX) > 5 || Math.abs(y - lastMouseY) > 5) {
                mousePosRef.current = { x, y };
                lastMouseX = x;
                lastMouseY = y;
                needsRedraw = true;
            }
        };

        window.addEventListener('resize', updateCanvasSize);
        window.addEventListener('mousemove', handleMouseMove);
        updateCanvasSize();

        /* Animation loop — with throttling and dirty checking */
        let lastTime = 0;
        const animateLoop = (timestamp) => {
            if (timestamp - lastTime > 16 && needsRedraw) { // Cap at ~60fps and only draw when needed
                ctxRef.current?.clearRect(0, 0, canvas.width, canvas.height);
                drawArrow();
                needsRedraw = false;
                lastTime = timestamp;
            }
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
            {/* ─── Navigation with Parallax ─── */}
            <motion.nav
                style={{ y: navY }}
                className="w-full max-w-5xl mx-auto flex justify-between items-center px-6 py-6 text-sm select-none z-20 relative"
            >
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
            </motion.nav>

            {/* ─── Hero Content with Parallax ─── */}
            <main className="flex-grow flex flex-col items-center justify-center relative overflow-hidden">
                {/* Parallax Flowing Background Layers */}
                <motion.div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ y: parallaxY }}
                >
                    <div className="absolute inset-0 opacity-10">
                        <motion.div
                            animate={{
                                x: [0, 100, 0],
                                y: [0, 50, 0],
                            }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-full blur-3xl"
                        />
                        <motion.div
                            animate={{
                                x: [0, -80, 0],
                                y: [0, 100, 0],
                            }}
                            transition={{
                                duration: 25,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute top-1/3 right-20 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-pink-500/10 rounded-full blur-3xl"
                        />
                        <motion.div
                            animate={{
                                x: [0, 60, 0],
                                y: [0, -60, 0],
                            }}
                            transition={{
                                duration: 30,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-br from-teal-500/10 to-green-500/10 rounded-full blur-3xl"
                        />
                    </div>
                </motion.div>

                {/* Hero Content */}
                <motion.div
                    className="mt-12 sm:mt-16 lg:mt-24 flex flex-col items-center relative z-10"
                    style={{ y: contentY }}
                >
                    <motion.h1
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, margin: "-100px" }}
                        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-center px-4 max-w-3xl leading-tight"
                    >
                        {typeof heading === 'string' && heading.endsWith('.') ? (
                            <>
                                {heading.slice(0, -1)}
                                <span className="text-[#ef4444]">.</span>
                            </>
                        ) : (
                            heading
                        )}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, margin: "-100px" }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                        className="mt-3 text-center text-base sm:text-lg px-4 max-w-xl"
                        style={{ color: 'var(--muted)' }}
                    >
                        {tagline}
                    </motion.p>
                </motion.div>

                {/* ─── CTA Button (arrow target) ─── */}
                <motion.div
                    className="mt-8 flex justify-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: false, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                >
                    <button
                        ref={targetRef}
                        className="glass-btn px-8 py-3 text-base font-semibold opacity-90 hover:opacity-100 scale-95 hover:scale-100 transition-all duration-300 ease-out"
                        onClick={ctaAction}
                        style={{
                          border: '1px solid var(--text)',
                          color: 'var(--text)',
                          backgroundColor: 'var(--accent-light)',
                          boxShadow: '0 4px 20px var(--shadow-color)'
                        }}
                    >
                        {buttonText}
                    </button>
                </motion.div>

                {/* ─── Immersive Preview Image with Parallax & Scale ─── */}
                <motion.div
                    className="mt-16 w-full max-w-5xl mx-auto px-4 relative"
                    style={{
                        y: useTransform(smoothScrollY, [0, 1200], [0, -200]),
                        opacity: useTransform(smoothScrollY, [800, 1200], [1, 0.3])
                    }}
                >
                    {/* Decorative floating elements that move at different speeds */}
                    <motion.div
                        animate={{
                            rotate: 360,
                            y: [-20, 20, -20],
                        }}
                        transition={{
                            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                            y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute -top-8 -left-8 w-20 h-20 border-2 border-accent/30 rounded-full hidden xl:block"
                    />
                    <motion.div
                        animate={{
                            rotate: -360,
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            rotate: { duration: 80, repeat: Infinity, ease: "linear" },
                            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="absolute -bottom-6 -right-6 w-16 h-16 border border-accent/20 rounded-lg hidden xl:block"
                    />

                    {/* Main image container with enhanced 3D parallax effect */}
                    <motion.div
                        style={{
                            scale: imageScale,
                            rotateX: useTransform(smoothScrollY, [0, 1000], [0, 5]),
                            rotateY: useTransform(scrollY, [0, 1000], [0, -3]),
                            perspective: 1200
                        }}
                        className="relative transform-gpu will-change-transform"
                    >
                        <motion.div
                            className="glass-card-enhanced rounded-4xl p-2 shadow-2xl"
                            style={{
                                backgroundColor: 'var(--border)',
                                rotateX: useTransform(smoothScrollY, [0, 1000], [0, -2]),
                                rotateY: useTransform(smoothScrollY, [0, 1000], [0, 2]),
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            <div
                                className="relative w-full aspect-video sm:aspect-21/9 rounded-3xl overflow-hidden"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)'
                                }}
                            >
                                {/* Image overlay gradients for depth */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none z-10" />

                                <motion.img
                                    key={imageUrl}
                                    src={imageUrl}
                                    alt="WordLens preview — immersive reading experience"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    initial={{ scale: 1.1, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    style={{
                                        scale: imageScale,
                                        y: useTransform(smoothScrollY, [0, 800], [0, -50])
                                    }}
                                />

                                {/* Floating badge that reveals on scroll */}
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{
                                        opacity: scrollY.get() > 200 ? 1 : 0,
                                        x: scrollY.get() > 200 ? 0 : 50
                                    }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute bottom-8 right-8 z-20 glass-card px-4 py-2 flex items-center gap-2"
                                >
                                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                                        Live Preview
                                    </span>
                                </motion.div>

                                {/* Subtle vignette effect */}
                                <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/20 pointer-events-none" />
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
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
