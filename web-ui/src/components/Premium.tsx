"use client";

import ScrollReveal from "./ScrollReveal";
import Typewriter from "./Typewriter";

const features = [
  { name: "Real-Time Protection", free: true },
  { name: "Anti-Nuke System", free: true },
  { name: "Anti-Raid Protection", free: true },
  { name: "Anti-Bot Filtering", free: true },
  { name: "Anti-Link Filter", free: true },
  { name: "Lockdown System", free: true },
  { name: "Auto-Moderation", free: true },
  { name: "500+ Commands", free: true },
  { name: "Welcome/Goodbye System", free: true },
  { name: "Leveling & XP System", free: true },
  { name: "Economy System", free: true },
  { name: "Music Playback", free: true },
  { name: "Ticket System", free: true },
  { name: "Reaction Roles", free: true },
  { name: "Logging System", free: true },
  { name: "Polls & Giveaways", free: true },
  { name: "Custom Auto-Mod Rules", free: false },
  { name: "Priority Support", free: false },
  { name: "Custom Welcome Themes", free: false },
  { name: "Enhanced Economy", free: false },
  { name: "Server Analytics", free: false },
  { name: "Multi-Server Sync", free: false },
];

export default function Premium() {
  return (
    <section id="premium" className="py-24 px-6 border-t border-[#111]">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="inline-block px-3 py-1 border border-[#333] rounded-full text-xs font-mono text-[#888] mb-6">
            _PREMIUM
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <h2 className="text-4xl md:text-5xl font-mono font-bold mb-4">
            <Typewriter text="premium_features_" delay={500} />
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <p className="text-[#888] mb-12 max-w-lg">
            Advanced security is <span className="text-white font-medium">free</span>. Premium gives you the full experience.
          </p>
        </ScrollReveal>

        {/* Feature comparison */}
        <ScrollReveal delay={200}>
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden max-w-2xl mx-auto">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px] px-6 py-4 border-b border-[#222] bg-[#161616]">
              <span className="font-mono text-sm text-[#888]">Feature</span>
              <span className="font-mono text-sm text-[#888] text-center">Free</span>
              <span className="font-mono text-sm text-[#888] text-center">Premium</span>
            </div>

            {/* Rows */}
            {features.map((feat, i) => (
              <div
                key={feat.name}
                className={`grid grid-cols-[1fr_80px_80px] px-6 py-3 items-center ${
                  i < features.length - 1 ? "border-b border-[#1a1a1a]" : ""
                } hover:bg-[#161616] transition-colors`}
              >
                <span className="font-mono text-sm text-white">{feat.name}</span>
                <div className="flex justify-center">
                  {feat.free ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M4 9L7.5 12.5L14 5.5" stroke="#27c93f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M5 5L13 13M13 5L5 13" stroke="#ff4444" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex justify-center">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 9L7.5 12.5L14 5.5" stroke="#27c93f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-[#ddd] transition-colors"
            >
              Get Premium
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 13L13 1M13 1H1M13 1V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              href="#faq"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[#333] text-white rounded-lg hover:border-[#555] hover:bg-[#111] transition-all"
            >
              FAQ
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
