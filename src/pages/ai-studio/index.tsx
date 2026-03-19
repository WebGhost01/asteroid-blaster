import { useState, useRef, useCallback } from "react";
import {
  Brain, Code2, FileText, Image, Sparkles, Send, Loader2,
  Copy, Check, ChevronDown, Zap, Shield, Bug, TrendingUp,
  MessageSquare, BookOpen, Pencil, FlaskConical, Star
} from "lucide-react";

const API = "/api";

type Mode = "chat" | "analyzer" | "codereview" | "imagestudio";

interface ChatMsg { role: "user" | "assistant"; content: string; }
interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  topics: string[];
  sentiment: string;
  questions: string[];
  wordCount: number;
}
interface CodeReviewResult {
  overallScore: number;
  bugs: { severity: string; line?: string; description: string }[];
  security: { severity: string; description: string }[];
  performance: string[];
  improvements: string[];
  positives: string[];
  summary: string;
}

const CHAT_PRESETS = [
  { icon: Brain, label: "Research Assistant", prompt: "You are an expert research assistant. Provide thorough, well-cited explanations. Use markdown formatting. When relevant, suggest further reading topics." },
  { icon: Code2, label: "Senior Dev", prompt: "You are a senior software engineer with 15+ years of experience. Provide practical, production-quality code advice. Focus on best practices, performance, and maintainability." },
  { icon: Pencil, label: "Creative Writer", prompt: "You are a talented creative writing coach and author. Help craft compelling narratives, refine prose, and provide detailed feedback. Be imaginative and expressive." },
  { icon: FlaskConical, label: "Data Scientist", prompt: "You are an expert data scientist specializing in ML/AI, statistics, and data analysis. Explain concepts clearly with examples. Recommend appropriate techniques for each problem." },
  { icon: BookOpen, label: "Tutor", prompt: "You are a patient, encouraging tutor. Break down complex concepts into digestible steps. Use analogies and examples. Check for understanding and adapt your teaching style." },
  { icon: Star, label: "Startup Advisor", prompt: "You are a seasoned startup advisor with experience at multiple unicorns. Give frank, actionable business advice on strategy, product, growth, fundraising, and team building." },
];

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto my-3 font-mono border border-slate-700"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-pink-400 rounded px-1.5 py-0.5 text-sm font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-1 text-purple-300">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-purple-200">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-5 mb-2 text-white">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc my-0.5">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-5 list-decimal my-0.5">$2</li>')
    .replace(/\n{2,}/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br/>');
}

// ── CHAT MODE ──────────────────────────────────────────────────────────────
function ChatMode() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [preset, setPreset] = useState(CHAT_PRESETS[0]);
  const [showPresets, setShowPresets] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const msg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: msg }]);
    setStreaming(true); setStreamContent("");

    let cid = convId;
    if (!cid) {
      const c = await fetch(`${API}/openai/conversations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: msg.slice(0, 50) }),
      }).then(r => r.json());
      cid = c.id; setConvId(c.id);
    }

    const res = await fetch(`${API}/openai/conversations/${cid}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msg, systemPrompt: preset.prompt }),
    });

    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value, { stream: true }).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const d = JSON.parse(line.slice(6));
          if (d.content) { acc += d.content; setStreamContent(acc); }
          if (d.done) { setMessages(m => [...m, { role: "assistant", content: acc }]); setStreamContent(""); setStreaming(false); }
        } catch {}
      }
    }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [input, streaming, convId, preset]);

  return (
    <div className="flex flex-col h-full">
      {/* Preset selector */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Mode:</span>
        <div className="relative">
          <button onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white border border-white/10 transition-colors">
            <preset.icon className="w-4 h-4 text-purple-400" />
            {preset.label}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-10 w-52 py-1">
              {CHAT_PRESETS.map(p => (
                <button key={p.label} onClick={() => { setPreset(p); setShowPresets(false); setMessages([]); setConvId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                  <p.icon className="w-4 h-4 text-purple-400" />
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <preset.icon className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-slate-400 text-center max-w-sm text-sm">
              Currently acting as <span className="text-purple-300 font-medium">{preset.label}</span>. Ask anything.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-4">
              {["What are the most important trends in AI right now?","Explain the CAP theorem with examples","Help me write a compelling product description","What makes a good system design?"].map(q => (
                <button key={q} onClick={() => setInput(q)} className="text-xs p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-left border border-white/5 transition-colors">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 mt-1">
                <preset.icon className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user" ? "bg-purple-600 text-white rounded-tr-sm" : "bg-white/5 text-slate-200 rounded-tl-sm border border-white/10"
            }`}>
              {m.role === "assistant"
                ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} className="prose-invert" />
                : <p className="whitespace-pre-wrap">{m.content}</p>}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 mt-1">
              <preset.icon className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white/5 border border-white/10 text-sm text-slate-200">
              {streamContent
                ? <><div dangerouslySetInnerHTML={{ __html: renderMarkdown(streamContent) }} /><span className="inline-block w-1.5 h-4 bg-purple-400 ml-0.5 animate-pulse align-middle rounded-sm" /></>
                : <div className="flex gap-1.5 items-center h-5">{[0,150,300].map(d => <span key={d} className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2 items-end">
          <textarea value={input} onChange={e => { setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"; }}
            onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
            placeholder="Message..." rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            style={{ minHeight: "48px", maxHeight: "120px" }} />
          <button onClick={send} disabled={!input.trim()||streaming}
            className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center hover:bg-purple-500 disabled:opacity-40 shrink-0 transition-colors">
            {streaming ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ANALYZER MODE ──────────────────────────────────────────────────────────
function AnalyzerMode() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!text.trim() || loading) return;
    setLoading(true); setResult(null); setError("");

    const sysPrompt = `You are an expert text analyzer. Analyze the provided text and return ONLY a valid JSON object with exactly this structure:
{"summary":"2-3 sentence summary","keyPoints":["point1","point2","point3","point4","point5"],"topics":["topic1","topic2","topic3"],"sentiment":"Positive/Negative/Neutral/Mixed","questions":["question1","question2","question3"],"wordCount":123}
Return ONLY the JSON, no markdown, no explanation.`;

    try {
      const conv = await fetch(`${API}/openai/conversations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Analysis" }),
      }).then(r => r.json());

      const res = await fetch(`${API}/openai/conversations/${conv.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `Analyze this text:\n\n${text}`, systemPrompt: sysPrompt }),
      });

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.content) acc += d.content;
            if (d.done) {
              const jsonStr = acc.replace(/```json\n?|\n?```/g, "").trim();
              setResult(JSON.parse(jsonStr));
            }
          } catch {}
        }
      }
    } catch (e) {
      setError("Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const sentimentColor: Record<string,string> = { Positive:"text-green-400", Negative:"text-red-400", Neutral:"text-blue-400", Mixed:"text-yellow-400" };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <label className="text-sm font-medium text-slate-300 mb-2 block">Paste any text to analyze</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
          placeholder="Paste an article, essay, report, email, or any text here..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none" />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-500">{text.split(/\s+/).filter(Boolean).length} words</span>
          <button onClick={analyze} disabled={!text.trim()||loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-40 transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Brain className="w-4 h-4" />Analyze</>}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {loading && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Processing text with GPT-5.2...</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Word Count</p>
              <p className="text-2xl font-bold text-white">{result.wordCount.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sentiment</p>
              <p className={`text-2xl font-bold ${sentimentColor[result.sentiment] || "text-white"}`}>{result.sentiment}</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <h3 className="text-sm font-semibold text-purple-300 mb-2">Summary</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">Key Points</h3>
              <ul className="space-y-2">
                {result.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 text-xs flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {result.topics.map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 text-xs border border-purple-500/20">{t}</span>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <h3 className="text-sm font-semibold text-purple-300 mb-3">Follow-up Questions</h3>
                <ul className="space-y-2">
                  {result.questions.map((q, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-2"><span className="text-purple-400">?</span>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CODE REVIEW MODE ───────────────────────────────────────────────────────
function CodeReviewMode() {
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("typescript");
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const review = async () => {
    if (!code.trim() || loading) return;
    setLoading(true); setResult(null);
    const sysPrompt = `You are a principal software engineer doing a thorough code review. Analyze the provided ${lang} code and return ONLY a JSON object with this structure:
{"overallScore":85,"bugs":[{"severity":"high|medium|low","line":"line content or description","description":"what the bug is"}],"security":[{"severity":"high|medium|low","description":"security issue"}],"performance":["improvement1","improvement2"],"improvements":["suggestion1","suggestion2","suggestion3"],"positives":["good1","good2"],"summary":"2-3 sentence overall assessment"}
Return ONLY valid JSON. Be thorough and specific.`;

    try {
      const conv = await fetch(`${API}/openai/conversations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Code Review" }),
      }).then(r => r.json());

      const res = await fetch(`${API}/openai/conversations/${conv.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `Review this ${lang} code:\n\n\`\`\`${lang}\n${code}\n\`\`\``, systemPrompt: sysPrompt }),
      });

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.content) acc += d.content;
            if (d.done) {
              const json = acc.replace(/```json\n?|\n?```/g,"").trim();
              setResult(JSON.parse(json));
            }
          } catch {}
        }
      }
    } catch {}
    setLoading(false);
  };

  const sevColor = (s: string) => s==="high" ? "text-red-400 bg-red-400/10 border-red-400/20" : s==="medium" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" : "text-blue-400 bg-blue-400/10 border-blue-400/20";
  const scoreColor = (s: number) => s>=80 ? "text-green-400" : s>=60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="p-6 space-y-5 overflow-y-auto h-full">
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Paste your code</label>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-300 focus:outline-none">
              {["typescript","javascript","python","go","rust","java","c++","sql","react"].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <textarea value={code} onChange={e => setCode(e.target.value)} rows={10}
            placeholder={`// Paste your ${lang} code here...`}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm text-green-400 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none font-mono" />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={review} disabled={!code.trim()||loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-40 transition-colors">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Reviewing...</> : <><Bug className="w-4 h-4" />Review Code</>}
        </button>
      </div>

      {loading && <div className="flex items-center justify-center gap-3 py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /><span>GPT-5.2 is reviewing your code...</span></div>}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className={`text-5xl font-black ${scoreColor(result.overallScore)}`}>{result.overallScore}</div>
            <div>
              <p className="text-white font-semibold text-sm">Overall Score</p>
              <div className="w-48 h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${result.overallScore>=80?"bg-green-500":result.overallScore>=60?"bg-yellow-500":"bg-red-500"}`} style={{ width: `${result.overallScore}%` }} />
              </div>
              <p className="text-slate-400 text-xs mt-1">{result.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.bugs.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-3"><Bug className="w-4 h-4" />Bugs ({result.bugs.length})</h3>
                <div className="space-y-2">
                  {result.bugs.map((b, i) => (
                    <div key={i} className={`rounded-lg p-2.5 border text-xs ${sevColor(b.severity)}`}>
                      <span className="font-bold uppercase text-[10px]">{b.severity}</span>
                      {b.line && <code className="block my-1 bg-black/20 rounded px-1 text-slate-300">{b.line}</code>}
                      <p>{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.security.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-400 mb-3"><Shield className="w-4 h-4" />Security ({result.security.length})</h3>
                <div className="space-y-2">
                  {result.security.map((s, i) => (
                    <div key={i} className={`rounded-lg p-2.5 border text-xs ${sevColor(s.severity)}`}>
                      <span className="font-bold uppercase text-[10px]">{s.severity}</span>
                      <p className="mt-0.5">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3"><TrendingUp className="w-4 h-4" />Improvements</h3>
              <ul className="space-y-2">
                {result.improvements.map((imp, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-blue-400 shrink-0">→</span>{imp}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-3"><Zap className="w-4 h-4" />What's Good</h3>
              <ul className="space-y-2">
                {result.positives.map((p, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-green-400 shrink-0">✓</span>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── IMAGE STUDIO MODE ──────────────────────────────────────────────────────
function ImageStudioMode() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ prompt: string; url: string }[]>([]);

  const STYLES = ["photorealistic","oil painting","watercolor","digital art","anime","sketch","3D render","pixel art","cinematic","minimalist"];

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    const full = `${prompt}, ${style} style, high quality, detailed`;
    try {
      const res = await fetch(`${API}/openai/generate-image`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: full, size: "1024x1024" }),
      });
      const data = await res.json();
      if (data.b64_json) {
        setImages(prev => [{ prompt: full, url: `data:image/png;base64,${data.b64_json}` }, ...prev].slice(0, 6));
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">Image Prompt</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
            placeholder="A futuristic city at sunset with neon lights reflecting on rain-soaked streets..."
            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();generate();} }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">Style</label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map(s => (
              <button key={s} onClick={() => setStyle(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${style===s ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <button onClick={generate} disabled={!prompt.trim()||loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Image</>}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="w-20 h-20 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
          <p className="text-slate-400 text-sm">Creating your masterpiece with DALL-E...</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 group">
              <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
              <div className="p-3 flex items-center justify-between">
                <p className="text-xs text-slate-500 truncate flex-1">{img.prompt}</p>
                <a href={img.url} download={`ai-image-${i}.png`}
                  className="ml-2 text-xs text-purple-400 hover:text-purple-300 transition-colors shrink-0">Download</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function AIStudioPage() {
  const [mode, setMode] = useState<Mode>("chat");

  const tabs: { id: Mode; label: string; icon: typeof Brain; desc: string }[] = [
    { id: "chat",        label: "AI Chat",      icon: MessageSquare, desc: "Multi-persona chat" },
    { id: "analyzer",   label: "Text Analyzer", icon: FileText,      desc: "Structured analysis" },
    { id: "codereview", label: "Code Review",   icon: Code2,         desc: "AI-powered review" },
    { id: "imagestudio",label: "Image Studio",  icon: Image,         desc: "Text-to-image" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #0a0a1f 50%, #130d1e 100%)" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/50">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI Studio</h1>
            <p className="text-xs text-slate-500">GPT-5.2 · Multi-Tool Workspace</p>
          </div>
        </div>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                mode === tab.id
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "chat" && <ChatMode />}
        {mode === "analyzer" && <AnalyzerMode />}
        {mode === "codereview" && <CodeReviewMode />}
        {mode === "imagestudio" && <ImageStudioMode />}
      </div>
    </div>
  );
}
