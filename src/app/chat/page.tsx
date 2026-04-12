"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect } from "react";

const transport = new DefaultChatTransport({ api: "/api/graph/query" });

interface SubgraphContext {
  serialized: string;
  nodeCount: number;
  directedEdgeCount: number;
  undirectedEdgeCount: number;
  seeds: Array<{ nodeId: string; score: number }>;
  nodes: Array<{ id: string; content: string; type: string; entities: string[] }>;
}

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [context, setContext] = useState<SubgraphContext | null>(null);
  const isActive = status === "streaming" || status === "submitted";

  // Track which user message we last fetched context for
  const [lastContextMsgId, setLastContextMsgId] = useState<string | null>(null);

  // Fetch subgraph context only when a NEW user message appears (not on every stream token)
  useEffect(() => {
    if (!showContext) return;

    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return;

    const lastUserMsg = userMessages[userMessages.length - 1];
    if (lastUserMsg.id === lastContextMsgId) return; // Already fetched for this message

    const text = lastUserMsg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    if (!text) return;

    setLastContextMsgId(lastUserMsg.id);

    fetch("/api/graph/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text }),
    })
      .then((r) => r.json())
      .then((data) => setContext(data))
      .catch(() => {});
  }, [messages, showContext, lastContextMsgId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isActive) return;
    sendMessage({ text: input });
    setInput("");
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
        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showContext}
            onChange={(e) => setShowContext(e.target.checked)}
            className="rounded"
          />
          Show subgraph context
        </label>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 && (
              <div className="text-center text-muted text-sm py-16">
                <p>Ask a question about the loaded knowledge graph.</p>
                <div className="mt-4 space-y-2">
                  <SuggestedQuery
                    query="Who invented the Turing machine and why was it important?"
                    onClick={(q) => setInput(q)}
                  />
                  <SuggestedQuery
                    query="What is the relationship between ARPANET and the modern Internet?"
                    onClick={(q) => setInput(q)}
                  />
                  <SuggestedQuery
                    query="How did Boolean algebra influence computer science?"
                    onClick={(q) => setInput(q)}
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

        {/* Subgraph context panel */}
        {showContext && (
          <div className="w-80 bg-surface rounded-lg border border-border p-4 overflow-y-auto">
            <h3 className="text-sm font-medium mb-3">Subgraph Context</h3>
            {context ? (
              <div className="space-y-3">
                <div className="flex gap-3 text-xs">
                  <div className="bg-surface-2 rounded px-2 py-1">
                    <span className="text-muted">Nodes:</span>{" "}
                    <span className="font-mono">{context.nodeCount}</span>
                  </div>
                  <div className="bg-surface-2 rounded px-2 py-1">
                    <span className="text-muted">Edges:</span>{" "}
                    <span className="font-mono">
                      {context.directedEdgeCount + context.undirectedEdgeCount}
                    </span>
                  </div>
                </div>

                {/* Seed nodes */}
                <div>
                  <h4 className="text-xs text-muted mb-1">Seed Nodes</h4>
                  <div className="space-y-1">
                    {context.seeds.slice(0, 5).map((seed, i) => (
                      <div
                        key={i}
                        className="text-xs bg-surface-2 rounded px-2 py-1 font-mono"
                      >
                        score: {seed.score.toFixed(3)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retrieved nodes */}
                <div>
                  <h4 className="text-xs text-muted mb-1">Retrieved Nodes</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {context.nodes.slice(0, 15).map((node) => (
                      <div
                        key={node.id}
                        className="text-xs bg-surface-2 rounded px-2 py-1.5"
                      >
                        <span className={`node-${node.type} font-medium`}>
                          [{node.type}]
                        </span>{" "}
                        <span className="text-foreground">
                          {node.content.slice(0, 100)}
                          {node.content.length > 100 ? "..." : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw serialized format */}
                <div>
                  <h4 className="text-xs text-muted mb-1">
                    Serialized Format (sent to LLM)
                  </h4>
                  <pre className="text-[10px] bg-surface-2 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto text-muted font-mono whitespace-pre-wrap">
                    {context.serialized}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">
                Ask a question to see the extracted subgraph context.
              </p>
            )}
          </div>
        )}
      </div>
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
