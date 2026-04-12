"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

const transport = new DefaultChatTransport({ api: "/api/graph/query" });

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const isActive = status === "streaming" || status === "submitted";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isActive) return;
    sendMessage({ text: input });
    setInput("");
  }

  function handleSuggestedQuery(query: string) {
    setInput(query);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Query Graph</h1>
          <p className="text-muted text-xs mt-1">
            Ask questions — answers are generated from the knowledge graph context
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm py-16">
            <p>Ask a question about the loaded knowledge graph.</p>
            <div className="mt-4 space-y-2">
              <SuggestedQuery
                query="Who invented the Turing machine and why was it important?"
                onClick={handleSuggestedQuery}
              />
              <SuggestedQuery
                query="What is the relationship between ARPANET and the modern Internet?"
                onClick={handleSuggestedQuery}
              />
              <SuggestedQuery
                query="How did Boolean algebra influence computer science?"
                onClick={handleSuggestedQuery}
              />
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-2xl px-4 py-3 rounded-lg text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-surface border border-border"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {msg.parts
                  .filter((p) => p.type === "text")
                  .map((p, i) => (
                    <span key={i}>{p.text}</span>
                  ))}
              </div>
            </div>
          </div>
        ))}

        {isActive && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-lg px-4 py-3 text-sm text-muted">
              Traversing knowledge graph...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/30 border border-red-800 rounded-lg p-3 text-sm text-red-400">
            {error.message || "Failed to query graph. Is a dataset loaded?"}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the knowledge graph..."
          className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
          disabled={isActive}
        />
        <button
          type="submit"
          disabled={isActive || !input.trim()}
          className="px-5 py-3 bg-accent text-white text-sm rounded-lg hover:bg-accent-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function SuggestedQuery({
  query,
  onClick,
}: {
  query: string;
  onClick: (q: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(query)}
      className="block mx-auto px-3 py-1.5 text-xs bg-surface border border-border rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
    >
      {query}
    </button>
  );
}
