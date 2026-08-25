"use client";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";

const TEMPLATES: Record<string, string> = {
  Blank: `<h1>Hello, Msingi!</h1>\n<p>Edit this code and watch the preview update.</p>`,
  Colors: `<style>\n  .box { display: inline-block; width: 60px; height: 60px; margin: 4px; border-radius: 8px; }\n</style>\n<div class="box" style="background: #e07a5f;"></div>\n<div class="box" style="background: #3d8361;"></div>\n<div class="box" style="background: #3f5eda;"></div>\n<div class="box" style="background: #f5b942;"></div>`,
  "A Simple List": `<style>\n  li { padding: 4px 0; }\n</style>\n<h2>My Favourite Subjects</h2>\n<ul>\n  <li>Mathematics</li>\n  <li>Integrated Science</li>\n  <li>Kiswahili</li>\n</ul>`,
};

export function HtmlPlayground({ onFirstUse }: { onFirstUse: () => void }) {
  const [code, setCode] = useState(TEMPLATES.Blank);
  const [preview, setPreview] = useState(TEMPLATES.Blank);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPreview(code), 400);
    return () => clearTimeout(t);
  }, [code]);

  function run() {
    setPreview(code);
    if (!used) { setUsed(true); onFirstUse(); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.keys(TEMPLATES).map((name) => (
            <button key={name} onClick={() => { setCode(TEMPLATES[name]); setPreview(TEMPLATES[name]); }}
              className="tap px-3 py-1.5 rounded-full text-xs font-medium border" style={{ borderColor: "var(--slate)" }}>
              {name}
            </button>
          ))}
        </div>
        <button onClick={run} className="tap flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
          <Play size={14} /> Run
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
          className="w-full h-80 border rounded-2xl p-3 text-xs font-mono resize-none" style={{ borderColor: "var(--slate)" }} />
        <iframe title="Preview" sandbox="allow-scripts" srcDoc={preview}
          className="w-full h-80 border rounded-2xl bg-white" style={{ borderColor: "var(--slate)" }} />
      </div>
      <p className="text-xs text-[--ink-soft]">The preview runs in a sandboxed frame — it can&apos;t see or affect the rest of Msingi.</p>
    </div>
  );
}
