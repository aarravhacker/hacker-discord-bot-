"use client";

export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-[#222]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 font-mono text-lg font-bold">
            <span className="text-white text-xl">H</span>
            <span className="text-[#888]">&gt;</span>
            <span className="text-white">hacker</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="font-mono text-xs text-[#666] hover:text-white transition-colors"
            >
              features
            </a>
            <a
              href="#commands"
              className="font-mono text-xs text-[#666] hover:text-white transition-colors"
            >
              commands
            </a>
            <a
              href="#premium"
              className="font-mono text-xs text-[#666] hover:text-white transition-colors"
            >
              premium
            </a>
            <a
              href="#about"
              className="font-mono text-xs text-[#666] hover:text-white transition-colors"
            >
              about
            </a>
            <a
              href="#"
              className="font-mono text-xs text-[#666] hover:text-white transition-colors"
            >
              support
            </a>
          </div>

          {/* Copyright */}
          <p className="font-mono text-xs text-[#555]">
            &copy; 2026 Hacker Bot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
