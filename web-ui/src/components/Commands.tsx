"use client";

import { useState } from "react";
import { categories } from "@/data/commands";
import ScrollReveal from "./ScrollReveal";
import Typewriter from "./Typewriter";

export default function Commands() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = categories.filter(
    (c) =>
      c.name.includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.commands.some((cmd) => cmd.name.includes(search.toLowerCase()))
  );

  return (
    <section id="commands" className="py-24 px-6 border-t border-[#111]">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="inline-block px-3 py-1 border border-[#333] rounded-full text-xs font-mono text-[#888] mb-6">
            _COMMANDS
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <h2 className="text-4xl md:text-5xl font-mono font-bold mb-4">
            <Typewriter text="all_commands_" delay={300} />
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <p className="text-[#888] mb-8 max-w-lg">
            947 commands across 23 categories. Browse them all below or use
            the terminal above.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="flex items-center gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] font-mono">
                &gt;
              </span>
              <input
                type="text"
                placeholder="search commands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-lg pl-8 pr-4 py-3 font-mono text-sm text-white placeholder-[#555] outline-none focus:border-[#444] transition-colors"
              />
            </div>
            <span className="font-mono text-sm text-[#666] whitespace-nowrap">
              {categories.reduce((acc, c) => acc + c.commands.length, 0)}+ commands
            </span>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((cat, i) => (
            <ScrollReveal key={cat.name} delay={Math.min(i * 50, 400)}>
              <button
                onClick={() =>
                  setExpanded(expanded === cat.name ? null : cat.name)
                }
                className="w-full text-left p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#444] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <div>
                      <span className="font-mono font-bold text-sm">
                        {cat.name}
                      </span>
                      <span className="ml-2 text-xs text-[#666]">
                        {cat.commands.length} cmds
                      </span>
                    </div>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className={`text-[#666] transition-transform ${
                      expanded === cat.name ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M3 5L7 9L11 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {expanded === cat.name && (
                  <div className="mt-3 pt-3 border-t border-[#222] space-y-1 max-h-[300px] overflow-y-auto">
                    {cat.commands.map((cmd) => (
                      <div
                        key={cmd.name}
                        className="flex items-start gap-2 text-xs font-mono py-1"
                      >
                        <span className="text-[#666]">&gt;</span>
                        <span className="text-white font-medium min-w-[120px]">
                          {cmd.name}
                        </span>
                        <span className="text-[#666]">{cmd.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
