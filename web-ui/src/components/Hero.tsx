"use client";

import Terminal from "./Terminal";
import ScrollReveal from "./ScrollReveal";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side */}
          <div className="space-y-6">
            {/* Bot Avatar */}
            <ScrollReveal>
              <div className="w-20 h-20 rounded-full border-2 border-[#333] bg-[#111] flex items-center justify-center mb-4">
                <span className="text-3xl font-mono font-bold text-white">H</span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <p className="font-mono text-[#888] text-sm">
                &gt; hi, my name is
              </p>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                <span className="text-white">Hacker</span>{" "}
                <span className="text-[#555]">Bot</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <p className="text-lg text-[#888] max-w-md leading-relaxed">
                Advanced Discord{" "}
                <span className="text-white font-medium">Security</span> &{" "}
                <span className="text-white font-medium">Moderation</span>,
                protecting servers with real-time anti-nuke and customizable
                tools.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={400}>
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-[#ddd] transition-colors"
                >
                  Add to Server
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="ml-1"
                  >
                    <path
                      d="M1 13L13 1M13 1H1M13 1V13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-[#333] text-white rounded-lg hover:border-[#555] hover:bg-[#111] transition-all"
                >
                  Support Server
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 17L17 7M17 7H7M17 7V17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Side - Terminal */}
          <ScrollReveal delay={200} className="flex justify-center md:justify-end">
            <Terminal />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
