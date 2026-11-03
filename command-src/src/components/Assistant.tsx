// AI 助理：用公司资料回答简单问题（在浏览器里查，不连外网）。
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { deptById, peopleOfFloor } from '../lib/company';
import type { CompanyModel } from '../lib/company';
import type { Lang, Status } from '../types';
import { cn } from '../lib/cn';

type Msg = { from: 'me' | 'ai'; text: string };

const STATUS_WORDS: [Status, RegExp][] = [
  ['working', /工作|在做|忙|working|busy/i], ['error', /错误|故障|error|fail/i], ['waiting', /等待|批准|approval|waiting/i],
  ['available', /空闲|有空|available|idle|free/i], ['thinking', /思考|thinking/i], ['completed', /完成|completed|done/i]
];

function answer(q: string, m: CompanyModel, lang: Lang): string {
  const tr = (v: { zh: string; en: string }) => v[lang];
  const zh = lang === 'zh';
  const floor = m.floors.find((f) => new RegExp(`(^|[^a-z0-9])${f.code}([^a-z0-9]|$)`, 'i').test(q) || q.includes(tr(f.name).replace(/^\w+ · /, '')));
  const pool = floor ? peopleOfFloor(m, floor.id) : m.people;
  const where = floor ? `${floor.code} ` : (zh ? '全公司' : 'Company-wide: ');
  if (/卡住|blocked|阻塞/i.test(q)) {
    const b = m.tasks.filter((x) => x.status === 'blocked');
    return b.length ? (zh ? `卡住的任务有 ${b.length} 个：\n` : `${b.length} blocked tasks:\n`) + b.map((x) => `• ${tr(x.title)}（${deptById(m, x.dept)?.floor}）`).join('\n') : (zh ? '目前没有卡住的任务。' : 'No blocked tasks.');
  }
  if (/审核|review|名册|技术单|roster|order/i.test(q)) {
    const ev = m.events.slice(-3).reverse();
    return ev.length ? (zh ? `最近的真实审核纪录：\n` : 'Latest live review events:\n') + ev.map((e) => `• ${e.tool === 'name' ? (zh ? '名字审核' : 'Name review') : (zh ? '技术单' : 'Order review')} · ${new Date(e.t).toLocaleTimeString()}`).join('\n')
      : (zh ? '这台电脑的浏览器还没有审核纪录。打开名字审核或技术单审核处理一次，客服部的员工会马上更新。' : 'No review events in this browser yet. Process a file in Name or Order review and 2F updates instantly.');
  }
  const st = STATUS_WORDS.find(([, re]) => re.test(q));
  if (st) {
    const list = pool.filter((p) => p.status === st[0]);
    const label = { working: zh ? '在工作' : 'working', error: zh ? '状态错误' : 'in error', waiting: zh ? '在等批准' : 'waiting for approval', available: zh ? '空闲' : 'available', thinking: zh ? '在思考' : 'thinking', completed: zh ? '刚完成' : 'just completed' }[st[0]];
    return list.length ? `${where}${zh ? `有 ${list.length} 位${label}：` : `${list.length} ${label}: `}\n` + list.slice(0, 10).map((p) => `• ${tr(p.name)}${p.type === 'ai' ? ' (AI)' : ''} — ${tr(p.task)}`).join('\n') : `${where}${zh ? `没有${label}的人。` : `nobody ${label}.`}`;
  }
  const dept = m.departments.find((d) => q.includes(d.name.zh.split(' · ')[0]) || q.toLowerCase().includes(d.name.en.toLowerCase().split(' · ')[0]));
  if (dept) {
    const ppl = m.people.filter((p) => p.dept === dept.id);
    return `${dept.floor} · ${tr(dept.name)}\n${tr(dept.summary)}\n` + ppl.map((p) => `• ${tr(p.name)}${p.type === 'ai' ? ' (AI)' : ''} — ${tr(p.title)}`).join('\n');
  }
  if (floor) {
    const ai = pool.filter((p) => p.type === 'ai').length;
    return `${tr(floor.name)}\n${tr(floor.description)}\n${zh ? `${pool.length - ai} 位员工、${ai} 位 AI 员工。` : `${pool.length - ai} people, ${ai} AI agents.`}`;
  }
  const ai = m.people.filter((p) => p.type === 'ai').length;
  return zh
    ? `公司有 ${m.floors.length} 栋建筑、${m.departments.length} 个部门、${m.people.length - ai} 位员工和 ${ai} 位 AI 员工。可以问我：「2F 谁在工作」「卡住的任务」「最近的审核」「财务部」。`
    : `${m.floors.length} floors, ${m.departments.length} departments, ${m.people.length - ai} people and ${ai} AI agents. Try: "who is working on 2F", "blocked tasks", "latest reviews", "Finance".`;
}

export function Assistant() {
  const s = useStore();
  const { t, lang } = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: t('assistantGreeting') }]);
  const [q, setQ] = useState('');
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);
  if (!s.assistantOpen) return null;
  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    setMsgs((cur) => [...cur, { from: 'me', text }, { from: 'ai', text: answer(text, s.model, lang) }]);
    setQ('');
  };
  return (
    <div className="glass absolute bottom-3 right-3 z-30 flex h-[26rem] w-[22rem] max-w-[calc(100%-1.5rem)] animate-slideUp flex-col overflow-hidden rounded-2xl" role="dialog" aria-label={t('aiAssistant')}>
      <div className="flex items-center gap-2 border-b border-line/10 px-3 py-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-accent to-ai"><Bot className="size-4 text-white" /></span>
        <span className="flex-1 text-sm font-semibold">{t('aiAssistant')}</span>
        <button type="button" onClick={() => s.setAssistantOpen(false)} className="rounded-md p-1 text-muted hover:text-fg" aria-label={t('close')}><X className="size-4" /></button>
      </div>
      <div ref={list} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={cn('max-w-[88%] whitespace-pre-line rounded-xl px-3 py-2 text-xs leading-relaxed', m.from === 'me' ? 'ml-auto bg-brand/80 text-white' : 'bg-elevated/70 text-fg')}>{m.text}</div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line/10 p-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('askPlaceholder')} aria-label={t('askPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border border-line/15 bg-canvas/60 px-3 py-2 text-sm placeholder:text-faint focus:border-accent/50 focus:outline-none" />
        <button type="submit" className="grid size-9 place-items-center rounded-lg bg-accent text-white" aria-label={t('send')}><Send className="size-4" /></button>
      </form>
    </div>
  );
}
