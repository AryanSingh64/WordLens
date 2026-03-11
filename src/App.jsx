import React, { useState, useEffect } from 'react'
import { HeroSection } from './components/ui/dynamic-hero'
import { BookOpen, Volume2, FileText, Moon, Sun, Star } from 'lucide-react'

export const LogoSVG = ({ className = "w-7 h-7 md:w-8 md:h-8" }) => (
  <svg viewBox="0 0 100 100" className={`shrink-0 ${className}`}>
    <rect x="0" y="0" width="20" height="20" fill="#00F5D4" />
    <rect x="0" y="20" width="20" height="20" fill="#00F5D4" />
    <rect x="0" y="40" width="20" height="20" fill="#00F5D4" />
    <rect x="0" y="60" width="20" height="20" fill="#00F5D4" />
    <rect x="20" y="80" width="20" height="20" fill="#00BBF9" />
    <rect x="40" y="40" width="20" height="20" fill="#9B5DE5" />
    <rect x="40" y="60" width="20" height="20" fill="#9B5DE5" />
    <rect x="60" y="80" width="20" height="20" fill="#F15BB5" />
    <rect x="80" y="0" width="20" height="20" fill="#FF006E" />
    <rect x="80" y="20" width="20" height="20" fill="#FF006E" />
    <rect x="80" y="40" width="20" height="20" fill="#FF006E" />
    <rect x="80" y="60" width="20" height="20" fill="#FF006E" />
  </svg>
)

export const LogoBrand = ({ darkText = false, small = false }) => (
  <div className="flex items-center gap-[6px] select-none">
    <LogoSVG className={small ? 'w-5 h-5' : 'w-7 h-7 md:w-8 md:h-8'} />
    <span className={`font-['Helvetica','Arial',sans-serif] font-bold tracking-tighter leading-none ${small ? 'text-xl' : 'text-2xl md:text-[28px]'} ${darkText ? 'text-[#111]' : 'text-text'}`}>
      wordlens<sup className="text-[10px] md:text-xs font-normal ml-0.5 tracking-normal opacity-70">®</sup>
    </span>
  </div>
)

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-8 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      <div className="w-12 h-12 rounded-full bg-accent-light text-accent flex items-center justify-center mb-6">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl mb-3 text-text font-medium">{title}</h3>
      <p className="text-muted text-base leading-relaxed">{description}</p>
    </div>
  )
}

function TestimonialCard({ name, review, comment }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 mb-4 shadow-sm break-inside-avoid">
      <div className="flex text-yellow-400 mb-3">
        {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
      </div>
      <p className="text-text font-medium text-[15px] leading-snug mb-2">{review}</p>
      {comment && <p className="text-muted text-sm leading-relaxed mb-4">{comment}</p>}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent text-accent-light flex items-center justify-center font-bold text-sm">
          {name.charAt(0)}
        </div>
        <span className="text-text text-xs uppercase tracking-wider font-semibold">{name}</span>
      </div>
    </div>
  )
}

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Inject read-box keyframes once
  useEffect(() => {
    const id = 'wl-read-box-style';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `
        @keyframes read-box {
          0%   { clip-path: inset(0 100% 0 0); }
          40%  { clip-path: inset(0 0 0 0); }
          80%  { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 100% 0 0); }
        }
        .wl-read-box {
          position: relative;
          display: inline-block;
        }
        .wl-read-box::after {
          content: '';
          position: absolute;
          inset: -2px -6px;
          border: 2.5px solid #9B5DE5;
          border-radius: 4px;
          animation: read-box 3.5s ease-in-out infinite;
          pointer-events: none;
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const testimonials = [
    { name: "Robert", review: "I couldn't believe how fast and magically this extension worked. I couldn't be happier.", comment: "Seriously an incredibly simple tool for reading long PDFs." },
    { name: "Timothy", review: "Extremely happy with how quick and simple the translation process went. I can't thank you enough. Very impressive." },
    { name: "Lois Frederick", review: "Easy to lookup words on any website. Fast accurate definitions and got my meaning instantly." },
    { name: "Mr We", review: "The AI summary feature perfectly condenses long confusing paragraphs into plain English. It's built right into the browser!" },
    { name: "Nithin", review: "Simply wonderful experience. A must-have extension if you ever read technical documentation." },
    { name: "Solt Wagner", review: "You can now select any text and understand its tone context instantly. Built robustly and with a very clean UI." }
  ];

  return (
    <div className="min-h-screen bg-bg text-text scroll-smooth relative transition-colors duration-300 flex flex-col">

      {/* Hero Section */}
      <HeroSection
        heading={<><span className="wl-read-box">Read</span>{' with understanding.'}</>}
        tagline="WordLens sits beside your reading. Look up a word, understand a sentence, open a PDF — all without leaving the page."
        buttonText="Add to Chrome"
        imageUrl="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=60"
        logo={<LogoBrand small={true} />}
        headerRight={
          <button
            onClick={() => setIsDark(!isDark)}
            className="relative inline-flex items-center justify-center p-2 w-9 h-9 text-text rounded-full hover:bg-surface border border-transparent hover:border-border transition-colors focus:outline-none"
            title="Toggle Dark Mode"
          >
            <Moon size={18} className={`absolute transition-all duration-300 transform ${isDark ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
            <Sun size={18} className={`absolute transition-all duration-300 transform ${isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`} />
          </button>
        }
        navItems={[
          { id: 'how', label: 'Features', href: '#how-it-works' },
          { id: 'pdf', label: 'PDF Reader', href: 'pdf-viewer.html' },
        ]}
      />

      {/* --- HOW IT WORKS SECTION --- */}
      <section id="how-it-works" className="py-24 px-6 w-full flex flex-col items-center">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium text-text mb-4 tracking-tight">Quiet assistance, right where you read.</h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              No massive sidebars. No jumping between tabs. Just the context you need.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard icon={BookOpen} title="Double-click a word" description="Instantly see the definition, pronunciation, and a friendly, 1-2 sentence explanation." />
            <FeatureCard icon={Volume2} title="Select a sentence" description="Get a plain-English summary and understand the exact tone of what you are reading." />
            <FeatureCard icon={FileText} title="Open a PDF" description="Drop any PDF into the built-in reader and use all the same selection tools." />
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section className="py-24 px-6 w-full flex flex-col items-center bg-surface border-y border-border">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl tracking-tight font-medium text-text mb-3">What Our Customers Say</h2>
            <p className="text-muted text-lg">Hear from incredible readers building their vocabulary at lightning speed.</p>
          </div>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 mx-auto">
            {testimonials.map((t, idx) => (
              <TestimonialCard key={idx} name={t.name} review={t.review} comment={t.comment} />
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <button className="px-6 py-2 border-2 border-text text-text font-semibold rounded-full hover:bg-text hover:text-bg transition-colors text-sm">
              Load More
            </button>
          </div>
        </div>
      </section>

      {/* --- FOOTER SECTION --- */}
      <footer className="w-full bg-[#faefe5] pt-24 mt-auto overflow-hidden text-[#111]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col">

          <div className="flex flex-col md:flex-row justify-between items-start mb-20 gap-16">
            {/* Logo area */}
            <LogoBrand darkText={true} />

            {/* Links Grid — keep only real links */}
            <div className="grid grid-cols-2 gap-x-16 gap-y-10 text-sm">
              <div className="flex flex-col gap-4">
                <span className="text-[#888] font-medium mb-1">Product</span>
                <a href="#how-it-works" className="hover:opacity-60 transition-opacity">How it works</a>
                <a href="#how-it-works" className="hover:opacity-60 transition-opacity">Features</a>
                <a href="pdf-viewer.html" className="hover:opacity-60 transition-opacity">PDF Reader</a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[#888] font-medium mb-1">Connect</span>
                <a href="https://twitter.com" target="_blank" rel="noopener" className="hover:opacity-60 transition-opacity">X (Twitter)</a>
                <a href="https://github.com" target="_blank" rel="noopener" className="hover:opacity-60 transition-opacity">GitHub</a>
                <a href="#" className="hover:opacity-60 transition-opacity">Support</a>
              </div>
            </div>
          </div>

          {/* Copyright and Big Brand Text */}
          <div className="flex flex-col items-start w-full relative pt-10 border-t border-[#11111122]">
            <p className="text-xs text-[#666] mb-8 font-medium">© 2026 WordLens, Inc. All rights reserved.</p>
            <h1
              className="w-full text-[15vw] leading-[0.8] tracking-tighter font-bold text-center font-['Helvetica','Arial',sans-serif]"
              style={{ letterSpacing: '-0.05em' }}
            >
              wordlens<sup className="text-[6vw] font-normal ml-[0.2vw] opacity-70 align-top relative top-[2vw]">®</sup>
            </h1>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default App

