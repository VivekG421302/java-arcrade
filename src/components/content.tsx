import { Check, CheckCircle2, Copy, XCircle } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Prism from 'prismjs'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-properties'
import 'prismjs/components/prism-json'

// IDE-style Java colouring: variables/fields light blue, control-flow keywords purple (VS Code Dark+).
if (!('variable' in Prism.languages.java)) {
  Prism.languages.insertBefore('java', 'punctuation', { variable: /\b[a-z_]\w*\b/ })
  Prism.languages.insertBefore('rust', 'punctuation', { variable: /\b[a-z_]\w*\b/ })
  Prism.hooks.add('wrap', (env) => {
    if (env.type === 'keyword' && /^(if|else|for|while|do|return|break|continue|switch|case|default|try|catch|finally|throw|throws|yield|loop|match|in)$/.test(env.content)) env.classes.push('control')
  })
}

const ALIAS: Record<string, string> = { xml: 'markup', html: 'markup', sh: 'bash', shell: 'bash', yml: 'yaml' }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function highlight(code: string, lang: string) {
  const l = ALIAS[lang] ?? lang
  return Prism.languages[l] ? Prism.highlight(code, Prism.languages[l], l) : esc(code)
}

export function CodeBlock({ code, lang = 'text', accent }: { code: string; lang?: string; accent?: 'bad' | 'good' }) {
  const l = ALIAS[lang] ?? lang
  const html = useMemo(() => highlight(code, l), [code, l])
  const [copied, setCopied] = useState(false)
  const lines = code.split('\n').length
  const ring = accent === 'bad' ? 'border-l-4 border-l-red-500' : accent === 'good' ? 'border-l-4 border-l-emerald-500' : ''
  return (
    <div className={`dark-surface my-5 overflow-hidden rounded-lg border border-white/10 bg-[#1e1e1e] text-[13px] text-[#d4d4d4] shadow-sm ${ring}`}>
      <div className="flex items-center justify-between border-b border-white/10 pl-3 pr-1 font-sans text-xs uppercase tracking-wide text-slate-400">
        <span>{lang}</span>
        <button type="button" aria-label="Copy code to clipboard" data-tip="Copy code" data-tip-end=""
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded px-3 hover:bg-white/10 md:min-h-[32px]"
          onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
          {copied ? <><Check size={14} aria-hidden /> Copied</> : <><Copy size={14} aria-hidden /> Copy</>}
        </button>
      </div>
      <div className="flex overflow-x-auto font-mono leading-6">
        <pre aria-hidden className="select-none py-3 pl-3 pr-3 text-right text-slate-500">{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>
        <pre className="py-3 pr-4"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
      </div>
    </div>
  )
}

const InlineCode = ({ children }: { children?: ReactNode }) => (
  <code className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10">{children}</code>
)

const components: Components = {
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const m = /language-(\w+)/.exec(className || '')
    const txt = String(children).replace(/\n$/, '')
    return m || txt.includes('\n') ? <CodeBlock code={txt} lang={m?.[1]} /> : <InlineCode>{children}</InlineCode>
  },
  p: ({ children }) => <p className="my-3 max-w-[72ch] leading-7">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1.5 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1.5 pl-6">{children}</ol>,
  li: ({ children }) => <li className="max-w-[72ch] leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-sans font-semibold">{children}</strong>,
  h3: ({ children }) => <h3 className="mb-2 mt-6 font-sans text-lg font-semibold">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-5 font-sans font-semibold">{children}</h4>,
  a: ({ href, children }) => <a href={href} className="text-sky-500 underline" target="_blank" rel="noreferrer">{children}</a>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-sky-500 bg-sky-500/5 px-4 py-1">{children}</blockquote>,
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto">
      <table className="w-full border-collapse border-y-2 border-slate-700 font-sans text-sm dark:border-slate-300">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-slate-700 dark:border-slate-300">{children}</thead>,
  tr: ({ children }) => <tr className="even:bg-slate-100 dark:even:bg-white/5">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
}

export function Markdown({ md }: { md: string }) {
  return (
    <div className="font-serif">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{md}</ReactMarkdown>
    </div>
  )
}

/** Inline-only markdown (for table cells and short labels). */
export function Inline({ md }: { md: string }) {
  return (
    <ReactMarkdown components={{ p: ({ children }) => <>{children}</>, code: InlineCode }}>{md}</ReactMarkdown>
  )
}

/** Toggle tabs: [Anti-Pattern | Fix] */
export function DiffView({ bad, good, lang }: { bad: string; good: string; lang: string }) {
  const [tab, setTab] = useState<'bad' | 'good'>('bad')
  const tabs = [['bad', XCircle, 'Anti-Pattern'], ['good', CheckCircle2, 'Fix']] as const
  return (
    <div>
      <div role="tablist" aria-label="Code version" className="flex gap-2 font-sans">
        {tabs.map(([k, Icon, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-medium ${tab === k ? (k === 'bad' ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500') : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
            <Icon size={16} aria-hidden />{label}
          </button>
        ))}
      </div>
      <CodeBlock code={tab === 'bad' ? bad : good} lang={lang} accent={tab} />
    </div>
  )
}
