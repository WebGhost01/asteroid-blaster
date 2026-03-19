import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Trash2, Bot, User, Sparkles, Settings, X, ChevronDown, ImageIcon, Loader2 } from "lucide-react";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

const API = "/api";

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-900 text-slate-100 rounded-lg p-3 text-sm overflow-x-auto my-2 font-mono"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-700 rounded px-1 py-0.5 text-sm font-mono text-slate-800 dark:text-slate-200">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n{2,}/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
}

export default function AIPage() {
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful, knowledgeable AI assistant. Be concise but thorough. Format responses with markdown when helpful.");
  const [showSettings, setShowSettings] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: convList = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => fetch(`${API}/openai/conversations`).then(r => r.json()),
  });

  const { data: activeConv } = useQuery<ConversationWithMessages>({
    queryKey: ["conversation", activeConvId],
    queryFn: () => fetch(`${API}/openai/conversations/${activeConvId}`).then(r => r.json()),
    enabled: !!activeConvId,
  });

  const createConv = useMutation({
    mutationFn: (title: string) =>
      fetch(`${API}/openai/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).then(r => r.json()),
    onSuccess: (conv: Conversation) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(conv.id);
    },
  });

  const deleteConv = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API}/openai/conversations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(null);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [activeConv?.messages, streamingContent, scrollToBottom]);

  const handleNewChat = () => {
    const title = `Chat ${new Date().toLocaleTimeString()}`;
    createConv.mutate(title);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    if (!activeConvId) {
      const title = input.slice(0, 40) + (input.length > 40 ? "…" : "");
      const conv = await fetch(`${API}/openai/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).then(r => r.json()) as Conversation;
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(conv.id);
      await sendMessage(conv.id, input.trim());
    } else {
      await sendMessage(activeConvId, input.trim());
    }
  };

  const sendMessage = async (convId: number, content: string) => {
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    qc.setQueryData(["conversation", convId], (old: ConversationWithMessages | undefined) => {
      if (!old) return old;
      return {
        ...old,
        messages: [
          ...old.messages,
          { id: -1, conversationId: convId, role: "user", content, createdAt: new Date().toISOString() },
        ],
      };
    });

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`${API}/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, systemPrompt }),
        signal: abort.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setStreamingContent(accumulated);
              }
              if (data.done) {
                setStreamingContent("");
                setIsStreaming(false);
                qc.invalidateQueries({ queryKey: ["conversation", convId] });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    try {
      const res = await fetch(`${API}/openai/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, size: "1024x1024" }),
      });
      const data = await res.json();
      setGeneratedImage(`data:image/png;base64,${data.b64_json}`);
    } catch {
      alert("Image generation failed.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const displayMessages = activeConv?.messages ?? [];

  return (
    <div className="h-full flex overflow-hidden" style={{ height: "calc(100vh - 0px)" }}>
      {/* Conversations Sidebar */}
      <div className="w-72 border-r border-border/50 flex flex-col bg-card/30 shrink-0">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm">AI Assistant</h2>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowImageGen(!showImageGen)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Generate Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="p-4 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Prompt</span>
              <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-background p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
              placeholder="Customize AI behavior..."
            />
          </div>
        )}

        <button
          onClick={handleNewChat}
          className="m-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {convList.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-4">
              No conversations yet. Start a new chat!
            </p>
          )}
          {convList.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                activeConvId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate flex-1">{conv.title}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteConv.mutate(conv.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {showImageGen ? (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
            <div className="max-w-2xl w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-xl">AI Image Generation</h2>
                  <p className="text-sm text-muted-foreground">Generate stunning images with AI</p>
                </div>
              </div>
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGenerateImage()}
                  placeholder="Describe the image you want to create..."
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGeneratingImage ? "Generating..." : "Generate"}
                </button>
              </div>
              {isGeneratingImage && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
                  </div>
                  <p className="text-muted-foreground">Creating your image...</p>
                </div>
              )}
              {generatedImage && (
                <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
                  <img src={generatedImage} alt="Generated" className="w-full" />
                  <div className="p-4 bg-card flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">{imagePrompt}</span>
                    <a
                      href={generatedImage}
                      download="ai-generated.png"
                      className="text-sm text-primary hover:underline ml-4 shrink-0"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-inner">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-center">AI Assistant</h2>
            <p className="text-muted-foreground text-center max-w-md mb-10">
              Start a conversation, ask questions, get help with writing, coding, analysis, and more.
              Powered by GPT-5.2.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
              {[
                { icon: "💡", text: "Explain quantum computing in simple terms" },
                { icon: "✍️", text: "Write a professional email declining a meeting" },
                { icon: "🔍", text: "Help me debug this Python function" },
                { icon: "📊", text: "Create a business plan outline for a SaaS app" },
              ].map(({ icon, text }) => (
                <button
                  key={text}
                  onClick={() => {
                    setInput(text);
                    textareaRef.current?.focus();
                  }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors text-left text-sm"
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-muted-foreground leading-snug">{text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {displayMessages.map((msg, i) => (
              <div key={msg.id ?? i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border/50 text-foreground rounded-tl-sm shadow-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      className="prose prose-sm max-w-none dark:prose-invert"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-1 border border-border">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isStreaming && streamingContent && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-card border border-border/50 shadow-sm">
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
                    className="prose prose-sm max-w-none dark:prose-invert"
                  />
                  <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm align-middle" />
                </div>
              </div>
            )}
            {isStreaming && !streamingContent && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-border/50 shadow-sm">
                  <div className="flex gap-1.5 items-center h-5">
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder={activeConvId ? "Message AI... (Enter to send, Shift+Enter for newline)" : "Start a new conversation..."}
                rows={1}
                className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                style={{ minHeight: "48px", maxHeight: "200px" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Powered by GPT-5.2 via Replit AI Integrations
          </p>
        </div>
      </div>
    </div>
  );
}
