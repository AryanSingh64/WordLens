import React, { useState, useEffect } from 'react'
import { HeroSection } from './components/ui/dynamic-hero'
import { BookOpen, Volume2, FileText, Moon, Sun } from 'lucide-react'

// 2. We create a reusable component for the cards to keep the code clean
// It takes an Icon component, a title, and a single sentence of text.
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-8 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      {/* 
        The icon sits inside a subtle accent circle. 
        We use text-accent for the icon color and bg-accent-light for the background.
      */}
      <div className="w-12 h-12 rounded-full bg-accent-light text-accent flex items-center justify-center mb-6">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl mb-3 text-text font-medium">{title}</h3>
      <p className="text-muted text-base leading-relaxed">{description}</p>
    </div>
  )
}

function App() {
  const [isDark, setIsDark] = useState(false);

  // Automatically add/remove the 'dark' class on the HTML <html> element based on state
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-bg text-text scroll-smooth relative transition-colors duration-300">

      {/* --- TOP FLOATING ACTION BAR (Dark Mode Only) --- */}
      <div className="absolute top-4 left-4 flex items-center bg-surface border border-border rounded-md px-2 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] z-50">
        <button
          onClick={() => setIsDark(!isDark)}
          className="relative inline-flex items-center justify-center p-1.5 w-8 h-8 text-text rounded-md hover:bg-bg transition-colors focus:outline-none"
          title="Toggle Dark Mode"
        >
          <Moon size={16} className={`absolute transition-all duration-300 transform ${isDark ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
          <Sun size={16} className={`absolute transition-all duration-300 transform ${isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`} />
        </button>
      </div>

      {/* Our Hero Section from Part 1 */}
      <HeroSection
        heading="Read with understanding."
        tagline="WordLens sits beside your reading. Look up a word, understand a sentence, open a PDF — all without leaving the page."
        buttonText="Add to Chrome"
        imageUrl="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=60"
        navItems={[
          { id: 'how', label: 'How it works', href: '#how-it-works' },
          { id: 'pdf', label: 'PDF Reader', href: 'pdf-viewer.html' },
          { id: 'get', label: 'Get Extension', onClick: () => alert("We'll link to the Chrome store later!") },
        ]}
      />

      {/* --- HOW IT WORKS SECTION --- */}
      <section id="how-it-works" className="py-24 px-6 w-full flex flex-col items-center">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium text-text mb-4">Quiet assistance, right where you read.</h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              No massive sidebars. No jumping between tabs. Just the context you need.
            </p>
          </div>

          {/* 
            We use CSS Grid to perfectly lay out the 3 cards side-by-side on desktop, 
            and stack them vertically on mobile phones.
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={BookOpen}
              title="Double-click a word"
              description="Instantly see the definition, pronunciation, and a friendly, 1-2 sentence explanation."
            />
            <FeatureCard
              icon={Volume2}
              title="Select a sentence"
              description="Get a plain-English summary and understand the exact tone of what you are reading."
            />
            <FeatureCard
              icon={FileText}
              title="Open a PDF"
              description="Drop any PDF into the built-in reader and use all the same selection tools."
            />
          </div>
        </div>
      </section>

      {/* A simple, clean footer to end the page gracefully */}
      <footer className="py-12 text-center border-t border-border mt-12 bg-surface">
        <p className="text-muted font-sans text-sm"> WordLens — Designed for readers.</p>
      </footer>
    </div>
  )
}

export default App
