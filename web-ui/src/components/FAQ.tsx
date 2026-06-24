"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";
import Typewriter from "./Typewriter";

const faqs = [
  {
    question: "How do I add Hacker Bot to my server?",
    answer:
      "Click the 'Add to Server' button on our homepage or use the invite link. You'll need Administrator permission to add the bot.",
  },
  {
    question: "Is Hacker Bot free to use?",
    answer:
      "Yes! Hacker Bot offers a comprehensive free tier with advanced security features, moderation, and 500+ commands. Premium unlocks additional customization and priority support.",
  },
  {
    question: "What security features does Hacker Bot provide?",
    answer:
      "Hacker Bot includes anti-nuke protection, anti-raid systems, anti-bot filtering, anti-link protection, lockdown capabilities, and real-time threat monitoring.",
  },
  {
    question: "How do I set up auto-moderation?",
    answer:
      "Use the 'automod' command to access the auto-moderation manager. You can configure word filters, spam detection, caps limits, and more.",
  },
  {
    question: "Can I customize the welcome messages?",
    answer:
      "Absolutely! Use 'setwelcome' to configure welcome channels, messages, embeds, images, and colors. Premium users get access to animated themes.",
  },
  {
    question: "How do I get support?",
    answer:
      "Join our support server 'Moonlit Cafe' via the Support Server button. Premium members get priority support with faster response times.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 border-t border-[#111]">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <div className="inline-block px-3 py-1 border border-[#333] rounded-full text-xs font-mono text-[#888] mb-6">
            _FAQ
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <h2 className="text-4xl md:text-5xl font-mono font-bold mb-12">
            <Typewriter text="frequently_asked_" delay={600} />
          </h2>
        </ScrollReveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-[#161616] transition-colors"
                >
                  <span className="font-mono text-sm font-medium pr-4">
                    &gt; {faq.question}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className={`text-[#666] transition-transform flex-shrink-0 ${
                      openIndex === i ? "rotate-180" : ""
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
                </button>
                <div
                  style={{
                    maxHeight: openIndex === i ? "500px" : "0",
                    padding: openIndex === i ? "0 24px 16px" : "0 24px",
                    transition: "max-height 0.3s ease, padding 0.3s ease",
                  }}
                >
                  <p className="text-[#888] text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={500}>
          <div className="mt-8">
            <a
              href="#premium"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[#333] text-white rounded-lg hover:border-[#555] hover:bg-[#111] transition-all"
            >
              View Premium Features
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7L3 7M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
