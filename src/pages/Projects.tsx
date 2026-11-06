import { useCourse } from '../hooks/useCourse'
import { Accordion } from '../components/ui'
import { Markdown } from '../components/content'

const levelColor = (l: string) =>
  /capstone/i.test(l) ? 'bg-fuchsia-500/15 text-fuchsia-500' : /advanced/i.test(l) ? 'bg-red-500/15 text-red-500' : /intermediate/i.test(l) ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'

function Label({ children }: { children: string }) {
  return <h3 className="mb-1 mt-6 font-sans text-xs font-semibold uppercase tracking-wider text-slate-500 first:mt-1">{children}</h3>
}

export default function Projects() {
  const { data: content, meta } = useCourse()
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{meta.name} Projects to Build</h1>
      <p className="mt-1 font-serif text-slate-600 dark:text-slate-400">Build these after the roadmap, roughly in order. Each one lists what it must do, how the technology flows through it, and which real problems it teaches you to solve.</p>
      <div className="mt-6">
        {content.projects.map((p) => (
          <Accordion key={p.n}
            title={<span><span className="mr-2 font-mono text-sm text-slate-500">{p.n}.</span>{p.title}</span>}
            meta={
              <span className="flex flex-wrap items-center gap-1.5 font-normal">
                <span className={`rounded-full px-2 py-0.5 text-xs ${levelColor(p.level)}`}>{p.level}</span>
                {p.stack.map((s) => <span key={s} className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs text-slate-500">{s}</span>)}
              </span>
            }>
            <Label>What it should do</Label>
            <Markdown md={p.what} />
            <Label>How the tech flows</Label>
            <div className="border-l-2 border-sky-500/30 pl-4"><Markdown md={p.flow} /></div>
            <Label>Problems it solves</Label>
            <Markdown md={p.solves} />
          </Accordion>
        ))}
      </div>
    </div>
  )
}
