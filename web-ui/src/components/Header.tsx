"use client";

import { useState } from "react";

const navLinks = [
  { label: "features", href: "#features" },
  { label: "commands", href: "#commands" },
  { label: "premium", href: "#premium" },
  { label: "about", href: "#about" },
  { label: "faq", href: "#faq" },
  { label: "team", href: "#team" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#222]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-mono text-lg font-bold">
          <span className="text-white text-xl">H</span>
          <span className="text-[#888]">&gt;</span>
          <span className="text-white">hacker</span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-link font-mono text-sm text-[#888] hover:text-white transition-colors"
            >
              &gt;{link.label}
            </a>
          ))}
          <a
            href="http://localhost:3000/dashboard"
            className="font-mono text-sm px-4 py-1.5 rounded border border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#0a0a0a] transition-all"
          >
            Dashboard
          </a>
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {menuOpen ? (
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <>
                <path d="M3 5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#111] border-t border-[#222] px-6 py-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 font-mono text-sm text-[#888] hover:text-white transition-colors"
            >
              &gt;{link.label}
            </a>
          ))}
          <a
            href="http://localhost:3000/dashboard"
            onClick={() => setMenuOpen(false)}
            className="block py-2 font-mono text-sm text-[#00d4ff] hover:text-white transition-colors"
          >
            &gt;dashboard
          </a>
        </div>
      )}
    </header>
  );
}
