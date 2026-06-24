"use client";

import { useEffect, useState } from "react";

export default function Typewriter({
  text,
  delay = 0,
  speed = 50,
  className = "",
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let i = 0;

    const startTyping = () => {
      timeout = setTimeout(() => {
        const interval = setInterval(() => {
          if (i < text.length) {
            setDisplayed(text.slice(0, i + 1));
            i++;
          } else {
            clearInterval(interval);
            setTimeout(() => setShowCursor(false), 2000);
          }
        }, speed);
      }, delay);
    };

    startTyping();
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  return (
    <span className={className}>
      {displayed}
      {showCursor && (
        <span className="inline-block w-[3px] h-[1em] bg-white ml-0.5 align-middle cursor-blink" />
      )}
    </span>
  );
}
