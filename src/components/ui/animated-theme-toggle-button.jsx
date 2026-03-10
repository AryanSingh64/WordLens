import React, { useEffect, useRef, useState, useCallback } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

function useThemeState() {
    const [darkMode, setDarkMode] = useState(
        () =>
            typeof window !== "undefined"
                ? document.documentElement.classList.contains("dark")
                : false
    )

    useEffect(() => {
        const sync = () => setDarkMode(document.documentElement.classList.contains("dark"))
        const observer = new MutationObserver(sync)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
        return () => observer.disconnect()
    }, [])

    return [darkMode, setDarkMode]
}

function triggerThemeTransition(type) {
    if (!document.documentElement.animate) return; // Fallback

    if (type === "horizontal") {
        document.documentElement.animate(
            {
                clipPath: [
                    "inset(50% 0 50% 0)",
                    "inset(0 0 0 0)"
                ]
            },
            {
                duration: 700,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)", // Smoother easing
                pseudoElement: "::view-transition-new(root)",
            }
        )
    } else if (type === "vertical") {
        document.documentElement.animate(
            {
                clipPath: [
                    "inset(0 50% 0 50%)",
                    "inset(0 0 0 0)"
                ]
            },
            {
                duration: 700,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)",
                pseudoElement: "::view-transition-new(root)",
            }
        )
    }
}

export const AnimatedThemeToggleButton = ({
    type = "horizontal",
    className
}) => {
    const buttonRef = useRef(null)
    const [darkMode, setDarkMode] = useThemeState()

    const handleToggle = useCallback(async () => {
        if (!buttonRef.current) return

        if (!document.startViewTransition) {
            // Fallback for browsers without View Transition API
            const toggled = !darkMode
            setDarkMode(toggled)
            document.documentElement.classList.toggle("dark", toggled)
            return;
        }

        await document.startViewTransition(() => {
            flushSync(() => {
                const toggled = !darkMode
                setDarkMode(toggled)
                document.documentElement.classList.toggle("dark", toggled)
            })
        }).ready

        triggerThemeTransition(type)
    }, [darkMode, type, setDarkMode])

    return (
        <button
            ref={buttonRef}
            onClick={handleToggle}
            aria-label={`Toggle theme`}
            type="button"
            className={cn(
                "flex items-center justify-center p-2 rounded-full outline-none focus:outline-none transition-colors border shadow-sm cursor-pointer",
                // Using WordLens CSS variables for colors so it blends perfectly
                darkMode ? "bg-bg text-text border-border" : "bg-surface text-text border-border",
                className
            )}
            style={{ width: 44, height: 44 }}
        >
            <AnimatePresence mode="wait" initial={false}>
                {darkMode ? (
                    <motion.span
                        key="sun"
                        initial={{ opacity: 0, scale: 0.55, rotate: 25 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.33, ease: "easeOut" }}
                    >
                        <Sun size={20} />
                    </motion.span>
                ) : (
                    <motion.span
                        key="moon"
                        initial={{ opacity: 0, scale: 0.55, rotate: -25 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.33, ease: "easeOut" }}
                    >
                        <Moon size={20} />
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    )
}
