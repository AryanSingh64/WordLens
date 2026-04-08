import React, { useState, useEffect, useRef, useCallback } from 'react'
import { HeroSection } from './components/ui/dynamic-hero'
import { BookOpen, Volume2, FileText, Moon, Sun, Star, Download, Upload, Zap, Shield, Palette, Key } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'

// Import local book images
import annie from './assets/annie-spratt-gl7joOaABlI-unsplash.webp'
import emil from './assets/emil-widlund-xrbbXIXAWY0-unsplash.webp'
import enrico from './assets/enrico-bet-lc7xcWebECc-unsplash.webp'
import inaki from './assets/inaki-del-olmo-NIJuEQw0RKg-unsplash.webp'
import trnava from './assets/trnava-university-BEEyeib-am8-unsplash.webp'
import viktor from './assets/viktor-stefanoski-_72QmetH1Pw-unsplash.webp'

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
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage for saved preference, default to true (dark mode)
    return localStorage.getItem('wordlens-theme') !== 'light';
  });
  const [heroImage, setHeroImage] = useState(0); // Index of current image

  // Premium book & library themed images from local assets
  const bookImages = [
    annie,
    emil,
    enrico,
    inaki,
    trnava,
    viktor
  ];

  useEffect(() => {
    // Change image every 30 seconds
    const intervalId = setInterval(() => {
      setHeroImage(prev => (prev + 1) % bookImages.length);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('wordlens-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('wordlens-theme', 'light');
    }
  }, [isDark]);

  // Inject enhanced animation keyframes
  useEffect(() => {
    const id = 'wl-enhancements';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = `
        /* Liquid glass shimmer */
        @keyframes liquid-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* Orbs floating animation - optimized with transform3d */
        @keyframes orb-float {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.4; }
          25% { transform: translate3d(20px, -20px, 0) scale(1.1); opacity: 0.5; }
          50% { transform: translate3d(-10px, 15px, 0) scale(0.95); opacity: 0.35; }
          75% { transform: translate3d(15px, 10px, 0) scale(1.05); opacity: 0.45; }
        }

        /* Card entrance animation - GPU accelerated */
        @keyframes card-entrance {
          from {
            opacity: 0;
            transform: translate3d(0, 20px, 0) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        /* Shimmer overlay - simplified */
        .shimmer {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.08),
            transparent
          );
          background-size: 200% 100%;
          animation: liquid-shimmer 2s infinite linear;
          will-change: background-position;
        }

        /* Entrance animations with GPU acceleration */
        .animate-entrance {
          animation: card-entrance 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
          will-change: opacity, transform;
        }

        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }

        /* Installation step connector - optimized */
        .install-step-connector {
          position: absolute;
          top: 50%;
          left: calc(100% + 16px);
          right: calc(100% + 32px);
          height: 2px;
          background: linear-gradient(90deg, var(--accent), transparent);
          z-index: 0;
          will-change: transform;
        }

        /* Performance: reduce backdrop blur on scrollable areas */
        .glass-card {
          backdrop-filter: blur(12px) saturate(150%);
          -webkit-backdrop-filter: blur(12px) saturate(150%);
          transform: translateZ(0);
          contain: layout style paint;
        }

        /* Ambient orbs - GPU accelerated */
        .ambient-orb {
          will-change: transform;
          filter: blur(80px);
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const handleDownload = useCallback(() => {
    // Google Drive direct download link
    const zipUrl = 'https://drive.google.com/file/d/1xVAdN66XGQzJwxdva6iuTH7xMsPzm2Xf/view?usp=sharing';
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = 'wordlens-extension-v2.0.0.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const testimonials = [
    { name: "Robert", review: "I couldn't believe how fast and magically this extension worked. I couldn't be happier.", comment: "Seriously an incredibly simple tool for reading long PDFs." },
    { name: "Timothy", review: "Extremely happy with how quick and simple the translation process went. I can't thank you enough. Very impressive." },
    { name: "Lois Frederick", review: "Easy to lookup words on any website. Fast accurate definitions and got my meaning instantly." },
    { name: "Mr We", review: "The AI summary feature perfectly condenses long confusing paragraphs into plain English. It's built right into the browser!" },
    { name: "Nithin", review: "Simply wonderful experience. A must-have extension if you ever read technical documentation." },
    { name: "Solt Wagner", review: "You can now select any text and understand its tone context instantly. Built robustly and with a very clean UI." }
  ];

  const features = [
    {
      icon: BookOpen,
      title: "Double-Click Definitions",
      description: "Hover over any word and double-click to instantly see definitions, pronunciation, and clear explanations.",
      color: "from-green-400 to-emerald-500"
    },
    {
      icon: Volume2,
      title: "AI Sentence Summary",
      description: "Select any sentence to get a plain-English summary and understand the exact tone and meaning.",
      color: "from-blue-400 to-cyan-500"
    },
    {
      icon: FileText,
      title: "Built-in PDF Reader",
      description: "Open PDFs directly in WordLens and use all the same powerful lookup features without switching tabs.",
      color: "from-purple-400 to-pink-500"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "No context switching. All tools appear instantly where you need them, making reading smooth and uninterrupted.",
      color: "from-yellow-400 to-orange-500"
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your reading data stays private. We don't track your browsing or store your personal information.",
      color: "from-indigo-400 to-purple-500"
    },
    {
      icon: Palette,
      title: "Liquid Glass UI",
      description: "Beautiful glassmorphism design with smooth animations and micro-interactions that feel premium.",
      color: "from-teal-400 to-green-500"
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-text scroll-smooth relative transition-colors duration-300 flex flex-col overflow-hidden">

      {/* Ambient background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="ambient-orb w-96 h-96 bg-green-300 top-0 left-0" style={{ animationDelay: '0s' }}></div>
        <div className="ambient-orb w-80 h-80 bg-blue-300 top-1/3 right-0" style={{ animationDelay: '10s' }}></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        <HeroSection
          heading={<><span className="wl-read-box">Read</span>{' with understanding.'}</>}
          tagline="WordLens sits beside your reading. Look up a word, understand a sentence, open a PDF — all without leaving the page."
          buttonText="Get WordLens"
          ctaAction={handleDownload}
          imageUrl={bookImages[heroImage]}
          logo={<LogoBrand small={true} />}
          headerRight={
            <button
              onClick={() => setIsDark(!isDark)}
              className="relative inline-flex items-center justify-center p-2 w-10 h-10 text-text rounded-full glass-card hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent"
              title="Toggle Dark Mode"
            >
              <Moon size={18} className={`absolute transition-all duration-300 transform ${isDark ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`} />
              <Sun size={18} className={`absolute transition-all duration-300 transform ${isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`} />
            </button>
          }
          navItems={[
            { id: 'features', label: 'Features', href: '#features' },
            { id: 'install', label: 'Install', href: '#install' },
          ]}
        />
      </div>

      {/* --- FEATURES SECTION --- */}
      <section id="features" className="py-24 px-6 w-full flex flex-col items-center relative z-10">
        <div className="w-full max-w-7xl">
          <div className="text-center mb-20 animate-entrance">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-text mb-6 tracking-tight">
              Quiet assistance, right where you read.
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto leading-relaxed">
              No massive sidebars. No jumping between tabs. Just the context you need, exactly when you need it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="glass-card glass-card-enhanced p-8 flex flex-col items-center text-center group hover:scale-[1.02] animate-entrance"
                style={{ animationDelay: `${(idx + 1) * 100}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={32} strokeWidth={1.5} className="text-white" />
                </div>
                <h3 className="text-2xl mb-4 text-text font-medium leading-tight">{feature.title}</h3>
                <p className="text-muted text-lg leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- API KEY SETUP SECTION --- */}
      <section className="py-24 px-6 w-full flex flex-col items-center relative z-10">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12 animate-entrance">
            <h2 className="text-4xl md:text-5xl font-medium text-text mb-4 tracking-tight">
              Get Your Free API Key
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              WordLens uses Groq AI for ultra-fast responses. Getting your API key is quick, free, and takes less than 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-card glass-card-enhanced p-6 text-center animate-entrance delay-100">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent border border-accent/20 mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">1. Create Account</h3>
              <p className="text-sm text-muted">Sign up for free at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">console.groq.com</a></p>
            </div>

            <div className="glass-card glass-card-enhanced p-6 text-center animate-entrance delay-200">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent border border-accent/20 mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">2. Create API Key</h3>
              <p className="text-sm text-muted">Click "Create API Key" in your dashboard. No credit card required.</p>
            </div>

            <div className="glass-card glass-card-enhanced p-6 text-center animate-entrance delay-300">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent border border-accent/20 mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">3. Paste & Enjoy</h3>
              <p className="text-sm text-muted">Enter your key in WordLens settings. That's it!</p>
            </div>
          </div>

          <div className="glass-card glass-card-enhanced p-6 max-w-2xl mx-auto animate-entrance delay-400">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-text mb-1">Your privacy matters</h4>
                <p className="text-sm text-muted leading-relaxed">
                  API keys are stored locally in your browser using Chrome's secure storage. They are never sent to any server except Groq's API endpoints. WordLens is open-source and contains no tracking or telemetry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- DOWNLOAD & INSTALLATION SECTION --- */}
      <section id="install" className="py-24 px-6 w-full flex flex-col items-center relative z-10">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-16 animate-entrance">
            <h2 className="text-4xl md:text-5xl font-medium text-text mb-4 tracking-tight">
              Install WordLens
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Get the extension in seconds. Since we're not in the Chrome Web Store yet, install manually in just a few clicks.
            </p>
          </div>

          {/* Download Button */}
          <div className="flex justify-center mb-16 animate-entrance delay-200">
            <button
              onClick={handleDownload}
              className="glass-btn px-10 py-5 text-lg flex items-center gap-3 group shimmer"
            >
              <Download size={24} className="group-hover:animate-bounce" />
              <span>Download Extension</span>
            </button>
          </div>

          {/* Installation Steps */}
          <div className="space-y-8">
            <h3 className="text-2xl font-medium text-text text-center mb-12">Quick Installation Guide</h3>

            <div className="relative">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div key={step} className="relative flex items-start gap-6 mb-8 animate-entrance delay-300">
                  {step < 6 && <div className="install-step-connector"></div>}

                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-light border-2 border-accent flex items-center justify-center text-accent font-bold text-xl z-10">
                    {step}
                  </div>

                  <div className="glass-card p-6 flex-1">
                    <h4 className="text-lg font-semibold text-text mb-2">
                      {step === 1 && "Open Chrome Extensions"}
                      {step === 2 && "Enable Developer Mode"}
                      {step === 3 && "Load the Extension"}
                      {step === 4 && "Enable File Access (for PDFs)"}
                      {step === 5 && "Get Your API Key"}
                      {step === 6 && "Start Reading!"}
                    </h4>
                    <p className="text-muted leading-relaxed">
                      {step === 1 && "In your Chrome browser, navigate to chrome://extensions in the address bar."}
                      {step === 2 && "Toggle the Developer mode switch in the top right corner to enable it."}
                      {step === 3 && "Click Load unpacked and select the folder where you extracted the downloaded files."}
                      {step === 4 && (
                        <>
                          Find WordLens in the extensions list and enable{" "}
                          <strong className="font-semibold text-text">"Allow access to file URLs"</strong>.
                          This lets you open local PDF files.
                        </>
                      )}
                      {step === 5 && (
                        <>
                          Open WordLens settings (click the extension icon → Settings) and paste your free Groq API key.
                          {" "}Get one at{" "}
                          <a
                            href="https://console.groq.com/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            console.groq.com/keys
                          </a>
                        </>
                      )}
                      {step === 6 && "That's it! Select any word or text on any webpage, or open a PDF to start using WordLens instantly."}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Help */}
            <div className="mt-12 glass-card p-8 animate-entrance delay-400">
              <h4 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
                <Download size={24} className="text-accent" />
                What's Included
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Complete extension files
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Installation guide
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Icon assets (PNG, SVG)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Background script
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Content scripts
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  Popup and settings UI
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS SECTION --- */}
      <section className="py-24 px-6 w-full flex flex-col items-center relative z-10 bg-surface/50 backdrop-blur-sm">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-12 animate-entrance">
            <h2 className="text-3xl md:text-4xl tracking-tight font-medium text-text mb-3">What Our Customers Say</h2>
            <p className="text-muted text-lg">Hear from incredible readers building their vocabulary at lightning speed.</p>
          </div>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 mx-auto">
            {testimonials.map((t, idx) => (
              <TestimonialCard key={idx} name={t.name} review={t.review} comment={t.comment} />
            ))}
          </div>
        </div>
      </section>

      {/* --- TROUBLESHOOTING SECTION --- */}
      <section className="py-20 px-6 w-full flex flex-col items-center relative z-10">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12 animate-entrance">
            <h2 className="text-3xl md:text-4xl tracking-tight font-medium text-text mb-3">Having Issues?</h2>
            <p className="text-lg text-muted">Quick fixes for common problems</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card glass-card-enhanced p-6 space-y-3 animate-entrance delay-100">
              <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                PDF Won't Open?
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Make sure you've enabled <strong className="text-text">"Allow access to file URLs"</strong> for WordLens in <code className="bg-surface border border-border px-1 rounded text-accent text-xs">chrome://extensions</code>.
              </p>
            </div>

            <div className="glass-card glass-card-enhanced p-6 space-y-3 animate-entrance delay-200">
              <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                <Key size={18} className="text-accent" />
                Missing API Key?
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Click the WordLens icon → <strong className="text-text">Settings</strong> to enter your free Groq API key. Get one at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">console.groq.com/keys</a>.
              </p>
            </div>

            <div className="glass-card glass-card-enhanced p-6 space-y-3 animate-entrance delay-300">
              <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                Library Empty?
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                PDFs are saved automatically when you open them. Click <strong className="text-text">PDF</strong> in the popup to browse your library or add new files.
              </p>
            </div>

            <div className="glass-card glass-card-enhanced p-6 space-y-3 animate-entrance delay-400">
              <h3 className="text-lg font-semibold text-text flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 17 10 11 4 5"></polyline>
                  <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
                Need More Help?
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Check the <a href="#" className="text-accent hover:underline">documentation</a> or <a href="#" className="text-accent hover:underline">contact support</a> for assistance with installation and configuration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER SECTION --- */}
      <footer className="w-full pt-24 pb-12 mt-auto relative z-10 overflow-hidden">
        <div className="absolute inset-0 glass-card-enhanced" style={{ backgroundColor: 'var(--surface)', opacity: 0.3 }}></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col relative z-10">

          <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-12">
            {/* Logo area */}
            <LogoBrand darkText={!isDark} />

            {/* Links Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
              <div className="flex flex-col gap-3">
                <span className="text-muted font-medium mb-1">Product</span>
                <a href="#features" className="hover:opacity-70 transition-opacity py-1">Features</a>
                <a href="#install" className="hover:opacity-70 transition-opacity py-1">Installation</a>
                <a href="pdf-viewer.html" className="hover:opacity-70 transition-opacity py-1">PDF Reader</a>
                <button onClick={handleDownload} className="text-left hover:opacity-70 transition-opacity py-1 text-accent font-semibold">
                  Download Extension
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-muted font-medium mb-1">Connect</span>
                <a href="https://github.com" target="_blank" rel="noopener" className="hover:opacity-70 transition-opacity py-1">GitHub</a>
                <a href="#" className="hover:opacity-70 transition-opacity py-1">Support</a>
                <a href="#" className="hover:opacity-70 transition-opacity py-1">Privacy</a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex flex-col items-center w-full pt-8 border-t border-border/30">
            <p className="text-xs text-muted mb-4 font-medium">© 2026 WordLens, Inc. All rights reserved.</p>
            <div className="text-2xl font-bold tracking-tighter text-text/60 font-['Helvetica','Arial',sans-serif]">
              wordlens<sup className="text-xs font-normal ml-1 opacity-60">®</sup>
            </div>
          </div>
        </div>
      </footer>

      <Analytics />
    </div>
  )
}

export default App

