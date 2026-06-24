"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { categories } from "@/data/commands";

interface TerminalLine {
  type: "input" | "output" | "error";
  text: string;
}

const HELP_TEXT = categories.map(
  (c) => `  ${c.icon} ${c.name.padEnd(18)} ${c.commands.length.toString().padStart(2)} commands  — ${c.description}`
);

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "output", text: "Welcome to Hacker Terminal! Type 'help' to see available commands." },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  const processCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const newLines: TerminalLine[] = [{ type: "input", text: `$ ${cmd}` }];

    if (!trimmed) {
      setLines((prev) => [...prev, ...newLines]);
      return;
    }

    if (trimmed === "help") {
      newLines.push({ type: "output", text: "" });
      newLines.push({ type: "output", text: "Available categories:" });
      newLines.push({ type: "output", text: "" });
      HELP_TEXT.forEach((line) => {
        newLines.push({ type: "output", text: line });
      });
      newLines.push({ type: "output", text: "" });
      newLines.push({
        type: "output",
        text: "Type a category name to see its commands.",
      });
    } else if (trimmed === "clear") {
      setLines([]);
      return;
    } else {
      const category = categories.find((c) => c.name === trimmed);
      if (category) {
        newLines.push({ type: "output", text: "" });
        newLines.push({
          type: "output",
          text: `${category.icon} ${category.name} — ${category.description}`,
        });
        newLines.push({ type: "output", text: `${category.commands.length} commands available:` });
        newLines.push({ type: "output", text: "" });
        category.commands.forEach((cmd) => {
          newLines.push({
            type: "output",
            text: `  > ${cmd.name.padEnd(20)} ${cmd.description}`,
          });
        });
        newLines.push({ type: "output", text: "" });
        newLines.push({
          type: "output",
          text: `Type '${category.name} <command>' to see more details.`,
        });
      } else {
        const parts = trimmed.split(" ");
        const catName = parts[0];
        const cmdName = parts[1];
        const category = categories.find((c) => c.name === catName);

        if (category && cmdName) {
          const cmd = category.commands.find(
            (c) => c.name === cmdName
          );
          if (cmd) {
            newLines.push({ type: "output", text: "" });
            newLines.push({
              type: "output",
              text: `Command: ${cmd.name}`,
            });
            newLines.push({
              type: "output",
              text: `Category: ${category.name}`,
            });
            newLines.push({
              type: "output",
              text: `Description: ${cmd.description}`,
            });
            newLines.push({ type: "output", text: "" });
          } else {
            newLines.push({
              type: "error",
              text: `Error: Command '${cmdName}' not found in '${catName}'. Type 'help' to see available commands.`,
            });
          }
        } else {
          newLines.push({
            type: "error",
            text: `Error: '${trimmed}' is not a recognized command. Type 'help' to see available commands.`,
          });
        }
      }
    }

    setLines((prev) => [...prev, ...newLines]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      processCommand(input);
      setHistory((prev) => [input, ...prev]);
      setHistoryIndex(-1);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden shadow-2xl">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#161616] border-b border-[#222]">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          <span className="ml-3 font-mono text-xs text-[#666]">
            user@hacker:~
          </span>
        </div>

        {/* Terminal Body */}
        <div
          ref={terminalRef}
          className="p-4 h-[320px] overflow-y-auto font-mono text-sm"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, i) => (
            <div key={i} className={line.type === "error" ? "text-[#ff4444]" : ""}>
              {line.type === "input" ? (
                <span className="text-[#27c93f]">{line.text}</span>
              ) : (
                <span>{line.text}</span>
              )}
            </div>
          ))}

          {/* Input Line */}
          <div className="flex items-center mt-1">
            <span className="text-[#27c93f] mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none font-mono text-sm text-white"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            <span className="cursor-blink text-white ml-0.5">|</span>
          </div>
        </div>
      </div>

      <p className="text-center text-[#555] text-xs mt-3 font-mono">
        Try typing &apos;help&apos; or &apos;features&apos;
      </p>
    </div>
  );
}
