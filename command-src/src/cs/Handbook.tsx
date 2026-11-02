// 听竹轩「业务手册」：章节 + 问手册、话术一键复制、回传期限计算器、技术单命名产生器、费用 / 发货速查、每周 / 每月提醒清单。
// 内容从云端拿（只有登入的客服 / 老板看得到），账号密码不放在这里。
import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Calculator, Check, ClipboardList, Copy, FileText, Lock, Search, Sparkles } from 'lucide-react';
import { askHandbook, checklists, chapter, firstTable, tableRows, useChecks, useHandbook, type HBBlock, type HBChapter, type Handbook } from '../lib/handbook';
import { cn } from '../lib/cn';

type Tab = 'read' | 'tools' | 'checks';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d; };
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function useCopy() {
  const [done, setDone] = useState('');
  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    setDone(key); window.setTimeout(() => setDone((k) => (k === key ? '' : k)), 1500);
  };
  return { done, copy };
}

export function HandbookView({ me, initialQ = '' }: { me: string; initialQ?: string }) {
  const { status, data } = useHandbook();
  const [tab, setTab] = useState<Tab>('read');
  if (status !== 'ok' || !data) return <Locked status={status} />;
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 flex items-center gap-2 text-lg font-semibold"><BookOpen className="size-5 text-[#1A73E8]" />{data.title}</h2>
        <span className="text-xs text-muted">整理日期 {data.updated} · 内容只在登入后从云端载入</span>
        <div className="ml-auto flex rounded-full border border-[#DADCE0] bg-surface p-0.5 text-sm" role="tablist">
          {([['read', '手册', <FileText key="f" className="size-4" />], ['tools', '工具', <Calculator key="c" className="size-4" />], ['checks', '提醒清单', <ClipboardList key="l" className="size-4" />]] as [Tab, string, ReactNode][]).map(([k, l, ic]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('flex items-center gap-1.5 rounded-full px-3.5 py-1.5', tab === k ? 'bg-[#E8F0FE] font-semibold text-[#1967D2]' : 'text-muted hover:text-fg')}>{ic}{l}</button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'read' ? <Reader hb={data} initialQ={initialQ} /> : tab === 'tools' ? <Tools hb={data} /> : <Checks hb={data} me={me} />}
      </div>
    </div>
  );
}

function Locked({ status }: { status: string }) {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-[#DADCE0] bg-surface p-8 text-center">
      <div>
        <Lock className="mx-auto size-8 text-[#9AA0A6]" />
        <h3 className="mt-3 text-lg font-semibold">{status === 'loading' ? '载入手册中…' : '手册在云端，登入后才看得到'}</h3>
        <p className="mt-1 max-w-md text-sm text-muted">{status === 'error' ? '云端暂时连不上，请稍后再试。' : '业务手册是内部资料，不放在网站档案里。请登出再登入一次连上公司云端；如果右上角显示「本机模式」，代表现在网络连不到云端。'}</p>
      </div>
    </div>
  );
}

// ---------- 手册：左边章节、上面问手册、右边内容 ----------
function Reader({ hb, initialQ }: { hb: Handbook; initialQ: string }) {
  const [no, setNo] = useState(1);
  const [q, setQ] = useState(initialQ);
  const hits = useMemo(() => askHandbook(hb, q), [hb, q]);
  const ch = chapter(hb, no);
  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[240px_1fr]">
      <nav className="min-h-0 overflow-y-auto rounded-2xl border border-[#DADCE0] bg-surface p-2" aria-label="章节">
        {hb.chapters.map((c) => (
          <button key={c.no} type="button" onClick={() => { setNo(c.no); setQ(''); }} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm', no === c.no && !q ? 'bg-[#E8F0FE] font-semibold text-[#1967D2]' : 'hover:bg-elevated')}>
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#F1F3F4] text-[11px] text-muted">{c.no}</span>{c.title}
          </button>
        ))}
      </nav>
      <section className="flex min-h-0 flex-col gap-3">
        <label className="flex h-11 items-center gap-2 rounded-full border border-[#DADCE0] bg-surface px-4 focus-within:border-[#1A73E8]">
          <Sparkles className="size-4 text-[#9334E6]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="问手册，例如：天尊手表要多久发货？二次命名多少钱？" aria-label="问手册" className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          <Search className="size-4 text-muted" />
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[#DADCE0] bg-surface p-5">
          {q ? (
            hits.length ? (
              <div className="space-y-3">
                <p className="text-xs text-muted">在手册里找到最相关的 {hits.length} 段（点章节名看全文）：</p>
                {hits.map((h, i) => (
                  <div key={i} className="rounded-xl border border-[#E8EAED] p-3">
                    <button type="button" onClick={() => { setNo(h.ch.no); setQ(''); }} className="text-xs font-semibold text-[#1967D2] hover:underline">第 {h.ch.no} 章 · {h.ch.title}</button>
                    <p className="mt-1 text-sm leading-relaxed">{h.text}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted">手册里没找到。换个说法试试，或问组长。</p>
          ) : ch && <ChapterView ch={ch} />}
        </div>
      </section>
    </div>
  );
}

function ChapterView({ ch }: { ch: HBChapter }) {
  const { done, copy } = useCopy();
  return (
    <article>
      <h3 className="text-xl font-semibold">{ch.no}. {ch.title}</h3>
      <div className="mt-3 space-y-3">{ch.blocks.map((b, i) => <Block key={i} b={b} k={`${ch.no}-${i}`} done={done} copy={copy} />)}</div>
    </article>
  );
}

function Block({ b, k, done, copy }: { b: HBBlock; k: string; done: string; copy: (t: string, k: string) => void }) {
  if (b.type === 'h') return <h4 className="pt-2 text-[15px] font-semibold text-[#1967D2]">{b.text}</h4>;
  if (b.type === 'p') return <p className="text-sm leading-relaxed">{b.text}</p>;
  if (b.type === 'ol' || b.type === 'ul') {
    const L = b.type === 'ol' ? 'ol' : 'ul';
    return <L className={cn('space-y-1.5 pl-5 text-sm leading-relaxed', b.type === 'ol' ? 'list-decimal' : 'list-disc')}>{b.items.map((x, i) => <li key={i}>{x}</li>)}</L>;
  }
  const t = tableRows(b);
  const script = t.head.some((h) => h.includes('话术'));
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8EAED]">
      <table className="w-full text-sm">
        <thead className="bg-[#F8F9FA] text-left text-xs text-muted"><tr>{t.head.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}{script && <th className="w-16" />}</tr></thead>
        <tbody>{t.rows.map((r, i) => (
          <tr key={i} className="border-t border-[#F1F3F4] align-top">
            {r.map((c, j) => <td key={j} className="whitespace-pre-wrap px-3 py-2">{c}</td>)}
            {script && <td className="px-2 py-1.5"><button type="button" onClick={() => copy(r[Math.max(0, t.head.findIndex((h) => h.includes('话术')))] ?? '', `${k}-${i}`)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[#1967D2] hover:bg-[#E8F0FE]">{done === `${k}-${i}` ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{done === `${k}-${i}` ? '已复制' : '复制'}</button></td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ---------- 工具 ----------
function Tools({ hb }: { hb: Handbook }) {
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto pb-2 xl:grid-cols-2">
      <Scripts hb={hb} />
      <div className="space-y-3">
        <Deadline hb={hb} />
        <Naming />
      </div>
      <QuickTable title="新名字业务费用" t={firstTable(chapter(hb, 6))} />
      <QuickTable title="产品发货时间" t={firstTable(chapter(hb, 14))} />
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#DADCE0] bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">{icon}{title}</h3>
      {children}
    </section>
  );
}
const Field = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <label className="flex flex-col gap-1 text-xs text-muted">{label}
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 rounded-lg border border-[#DADCE0] px-2.5 text-sm text-fg focus:border-[#1A73E8] focus:outline-none" />
  </label>
);

// 话术：填一次订单资料，每一句话术自动换好，按一下就复制
function Scripts({ hb }: { hb: Handbook }) {
  const t = firstTable(chapter(hb, 2));
  const rows = t ? tableRows(t).rows : [];
  const [v, setV] = useState({ order: '', name: '', date: today(), track: '', courier: '', a: '', apy: '', b: '', bpy: '' });
  const set = (k: keyof typeof v) => (x: string) => setV((s) => ({ ...s, [k]: x }));
  const { done, copy } = useCopy();
  const fill = (tpl: string) => {
    let s = tpl;
    if (v.a) s = s.replace('名字A 拼音', `${v.a} ${v.apy}`.trim()).replace('（名字A）', `（${v.a}）`);
    if (v.b) s = s.replace('名字B 拼音', `${v.b} ${v.bpy}`.trim());
    if (v.order) s = s.replace('订单号', v.order);
    if (v.name) s = s.replace('姓名', v.name);
    if (v.track) s = s.replace('快递单号', v.track);
    if (v.courier) s = s.replace('快递公司', v.courier);
    if (v.date) s = s.replace('YYYY-MM-DD', v.date);
    return s;
  };
  return (
    <Card title="话术一键复制（第 2 章）" icon={<Copy className="size-4 text-[#1A73E8]" />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="订单号" value={v.order} onChange={set('order')} />
        <Field label="姓名" value={v.name} onChange={set('name')} />
        <Field label="日期" value={v.date} onChange={set('date')} type="date" />
        <Field label="快递单号" value={v.track} onChange={set('track')} />
        <Field label="快递公司" value={v.courier} onChange={set('courier')} placeholder="顺丰 / 中通…" />
        <span />
        <Field label="名字 A" value={v.a} onChange={set('a')} />
        <Field label="名字 A 拼音" value={v.apy} onChange={set('apy')} />
        <span />
        <Field label="名字 B" value={v.b} onChange={set('b')} />
        <Field label="名字 B 拼音" value={v.bpy} onChange={set('bpy')} />
      </div>
      <ul className="mt-3 divide-y divide-[#F1F3F4]">
        {rows.map((r, i) => {
          const text = fill(r[1] ?? '');
          return (
            <li key={i} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1"><div className="text-xs font-medium text-muted">{r[0]}</div><p className="mt-0.5 text-sm leading-relaxed">{text}</p></div>
              <button type="button" onClick={() => copy(text, 's' + i)} className={cn('flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium', done === 's' + i ? 'bg-[#E6F4EA] text-[#137333]' : 'bg-[#1A73E8] text-white hover:brightness-110')}>{done === 's' + i ? <><Check className="size-3.5" />已复制</> : <><Copy className="size-3.5" />复制</>}</button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// 回传期限：选产品 + 收到日期 → 最晚哪天要回传
function Deadline({ hb }: { hb: Handbook }) {
  const t = firstTable(chapter(hb, 1));
  const rows = t ? tableRows(t).rows.map((r) => ({ name: r[1], days: parseInt(r[2], 10) || 0 })) : [];
  const [p, setP] = useState(0);
  const [d, setD] = useState(today());
  const r = rows[p];
  const due = r && d ? addDays(d, r.days) : null;
  const left = due ? Math.ceil((+due - +new Date(today() + 'T00:00:00')) / 864e5) : 0;
  return (
    <Card title="技术单回传期限（第 1 章）" icon={<Calculator className="size-4 text-[#1E8E3E]" />}>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">产品
          <select value={p} onChange={(e) => setP(Number(e.target.value))} className="h-9 rounded-lg border border-[#DADCE0] px-2 text-sm text-fg">{rows.map((x, i) => <option key={i} value={i}>{x.name}（{x.days} 天）</option>)}</select>
        </label>
        <Field label="技术单日期" value={d} onChange={setD} type="date" />
      </div>
      {due && <div className={cn('mt-3 rounded-xl p-3 text-sm', left < 0 ? 'bg-[#FCE8E6] text-[#C5221F]' : left <= 2 ? 'bg-[#FEF7E0] text-[#B06000]' : 'bg-[#E6F4EA] text-[#137333]')}>
        最晚回传：<b className="text-base">{fmt(due)}（星期{WEEK[due.getDay()]}）</b>　{left < 0 ? `已经超期 ${-left} 天` : left === 0 ? '就是今天' : `还有 ${left} 天`}
      </div>}
    </Card>
  );
}

// 技术单命名（第 9、15 章的规则）
function Naming() {
  const [kind, setKind] = useState<'mz' | 'baby' | 'tool' | 'urgent' | 'second'>('mz');
  const [h, setH] = useState(false);
  const [d, setD] = useState(today());
  const [extra, setExtra] = useState('');
  const [n, setN] = useState('1');
  const [who, setWho] = useState('');
  const { done, copy } = useCopy();
  const H = h ? '（H）' : '';
  const name = kind === 'mz' ? `技术单 ${d}（名正言顺）${H}`
    : kind === 'baby' ? `技术单 ${d}（名正言顺）（新生儿）${H}`
      : kind === 'tool' ? `技术单 ${d}${extra ? '&' + extra.split(/[,，\s&]+/).filter(Boolean).map((x) => x.padStart(2, '0')).join('&') : ''}${h ? ' H' : ''}`
        : kind === 'urgent' ? `名正言顺技术单（特殊加急）${d}（${n}）`
          : `${who || '姓名'}名正言顺技术单（加急）${d.split('-').reverse().join('-')}（${n}）`;
  const kinds: [typeof kind, string][] = [['mz', '名正言顺'], ['baby', '新生儿名正言顺'], ['tool', '其他工具'], ['urgent', '名正言顺特殊加急'], ['second', '二次命名（加急）']];
  return (
    <Card title="技术单命名产生器（第 9、15 章）" icon={<FileText className="size-4 text-[#F9AB00]" />}>
      <div className="flex flex-wrap gap-1.5">{kinds.map(([k, l]) => <button key={k} type="button" onClick={() => setKind(k)} className={cn('rounded-full border px-3 py-1 text-xs', kind === k ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1967D2]' : 'border-[#DADCE0] text-muted')}>{l}</button>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="日期" value={d} onChange={setD} type="date" />
        {kind === 'tool' && <Field label="合并的其他日期（日）" value={extra} onChange={setExtra} placeholder="例：5, 6" />}
        {(kind === 'urgent' || kind === 'second') && <Field label="第几份" value={n} onChange={setN} />}
        {kind === 'second' && <Field label="使用人姓名" value={who} onChange={setWho} />}
        {(kind === 'mz' || kind === 'baby' || kind === 'tool') && <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={h} onChange={(e) => setH(e.target.checked)} className="size-4 accent-[#1A73E8]" />H 单</label>}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#F8F9FA] p-3">
        <code className="min-w-0 flex-1 break-all text-sm">{name}</code>
        <button type="button" onClick={() => copy(name, 'n')} className="flex shrink-0 items-center gap-1 rounded-full bg-[#1A73E8] px-3 py-1.5 text-xs font-medium text-white">{done === 'n' ? <><Check className="size-3.5" />已复制</> : <><Copy className="size-3.5" />复制</>}</button>
      </div>
      {kind === 'tool' && <p className="mt-2 text-[11px] text-muted">其他工具三天发一次：周六、周一、周二；H 单周三到周五。</p>}
    </Card>
  );
}

function QuickTable({ title, t }: { title: string; t?: Extract<HBBlock, { type: 'table' }> }) {
  if (!t) return null;
  const r = tableRows(t);
  return (
    <Card title={title} icon={<BookOpen className="size-4 text-[#9334E6]" />}>
      <div className="grid gap-2 sm:grid-cols-2">
        {r.rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-[#E8EAED] p-2.5">
            <div className="text-xs text-muted">{row[0]}</div>
            <div className="text-[15px] font-semibold">{row[1]}</div>
            {row[2] && <div className="mt-0.5 text-[11px] text-[#B06000]">{row[2]}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- 每周 / 每月提醒清单（云端共用） ----------
function Checks({ hb, me }: { hb: Handbook; me: string }) {
  const lists = useMemo(() => checklists(hb), [hb]);
  const { rows, toggle } = useChecks(true);
  const now = new Date();
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto pb-2 lg:grid-cols-2">
      {lists.map((l) => {
        const period = l.period(now);
        const doneSteps = new Set(rows.filter((r) => r.list === l.id && r.period === period).map((r) => r.step));
        const dueToday = l.due(now);
        return (
          <section key={l.id} className={cn('rounded-2xl border bg-surface p-4', dueToday ? 'border-[#F9AB00] shadow-[0_0_0_3px_#FEF7E0]' : 'border-[#DADCE0]')}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold">{l.title}</h3>
                <p className="text-xs text-muted">{l.when} · 这一期：{period}</p>
              </div>
              {dueToday && <span className="rounded-full bg-[#FEF7E0] px-2.5 py-1 text-xs font-semibold text-[#B06000]">今天要做</span>}
              <span className="rounded-full bg-[#F1F3F4] px-2.5 py-1 text-xs">{doneSteps.size}/{l.steps.length}</span>
            </div>
            <ol className="mt-3 space-y-1">
              {l.steps.map((s, i) => {
                const on = doneSteps.has(i);
                const by = rows.find((r) => r.list === l.id && r.period === period && r.step === i)?.done_by;
                return (
                  <li key={i}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-elevated">
                      <input type="checkbox" checked={on} onChange={() => void toggle(l.id, period, i, me)} className="mt-0.5 size-4 shrink-0 accent-[#1A73E8]" />
                      <span className={cn('text-sm leading-relaxed', on && 'text-faint line-through')}>{s}</span>
                      {on && by && <span className="ml-auto shrink-0 text-[10px] text-faint">{by}</span>}
                    </label>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
