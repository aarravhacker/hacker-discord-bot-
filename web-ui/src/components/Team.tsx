"use client";

import ScrollReveal from "./ScrollReveal";
import Typewriter from "./Typewriter";

const team = [
  {
    name: "Aarav Hacker",
    japanese: "！アーウラヴ！",
    username: "aarav_hei",
    role: "Made by Aarav Hacker",
    initial: "A",
  },
  {
    name: "Chocolate Boi",
    username: "chocolateboi",
    role: "Motivated by Chocolate Boi",
    initial: "C",
  },
];

export default function Team() {
  return (
    <section id="team" className="py-24 px-6 border-t border-[#111]">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="inline-block px-3 py-1 border border-[#333] rounded-full text-xs font-mono text-[#888] mb-6">
            _TEAM
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <h2 className="text-4xl md:text-5xl font-mono font-bold mb-12">
            <Typewriter text="meet_the_team_" delay={700} />
          </h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
          {team.map((member, i) => (
            <ScrollReveal key={member.name} delay={i * 100}>
              <div className="card-hover p-6 bg-[#111] border border-[#222] rounded-xl text-center">
                <div className="w-16 h-16 rounded-full bg-[#222] flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-mono font-bold text-white">
                    {member.initial}
                  </span>
                </div>
                <h3 className="font-mono font-bold text-lg">{member.name}</h3>
                {member.japanese && <p className="text-[#888] text-sm mt-1 font-mono">{member.japanese}</p>}
                <p className="text-[#666] text-xs mt-2">{member.username}</p>
                <p className="text-[#555] text-xs mt-3 border-t border-[#222] pt-3">{member.role}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
