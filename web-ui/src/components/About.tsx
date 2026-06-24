"use client";

import ScrollReveal from "./ScrollReveal";
import Typewriter from "./Typewriter";

const points = [
  "Real-time threat detection and neutralization",
  "Customizable security for your server",
  "24/7 vigilant protection that never sleeps",
];

export default function About() {
  return (
    <section id="about" className="py-24 px-6 border-t border-[#111]">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <ScrollReveal>
              <div className="inline-block px-3 py-1 border border-[#333] rounded-full text-xs font-mono text-[#888] mb-6">
                ABOUT HACKER
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                <Typewriter text="Security that works for you." delay={400} />
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <p className="text-[#888] text-lg mb-8 leading-relaxed">
                Advanced Discord security ensuring your community stays safe.
                Real-time protection, customizable settings, 24/7 monitoring —
                all in one bot.
              </p>
            </ScrollReveal>

            <div className="space-y-4 mb-8">
              {points.map((point, i) => (
                <ScrollReveal key={point} delay={300 + i * 100}>
                  <div className="flex items-center gap-3 pb-4 border-b border-[#222]">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="#0a0a0a"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-white">{point}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={600}>
              <a
                href="#"
                className="inline-flex items-center gap-2 text-white font-medium hover:gap-3 transition-all"
              >
                Learn more about us
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3 8H13M13 8L9 4M13 8L9 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </ScrollReveal>
          </div>

          {/* Right - Bot Logo */}
          <ScrollReveal delay={200} className="flex justify-center">
            <div className="w-64 h-64 rounded-2xl border border-[#222] bg-[#111] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <span className="text-8xl font-mono font-bold text-white relative z-10">
                H
              </span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
