// 国内客服业务流程手册：内容存在 Supabase（cs_docs.handbook），只有登入的客服 / 老板拿得到；
// 不放在网站档案里（GitHub 是公开的）。账号密码不放，写「找组长拿」。
import { useEffect, useState } from 'react';
import { cloud } from './cloud';
import { useLive } from './live';

export type HBBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] };
export type HBChapter = { no: number; title: string; blocks: HBBlock[] };
export type Handbook = { title: string; updated: string; chapters: HBChapter[] };
export type HBStatus = 'loading' | 'ok' | 'locked' | 'error';

let cache: Handbook | null = null;

export function useHandbook(): { status: HBStatus; data: Handbook | null } {
  const { mode } = useLive();
  const [state, setState] = useState<{ status: HBStatus; data: Handbook | null }>(cache ? { status: 'ok', data: cache } : { status: 'loading', data: null });
  useEffect(() => {
    if (cache) return;
    if (mode === 'connecting') return;
    if (mode !== 'cloud') { setState({ status: 'locked', data: null }); return; }
    let alive = true;
    void cloud().from('cs_docs').select('data').eq('key', 'handbook').maybeSingle().then(({ data, error }) => {
      if (!alive) return;
      if (error || !data) { setState({ status: 'error', data: null }); return; }
      cache = data.data as Handbook;
      setState({ status: 'ok', data: cache });
    });
    return () => { alive = false; };
  }, [mode]);
  return state;
}

// 表格：手册的表第一行就是标题
export const tableRows = (b: Extract<HBBlock, { type: 'table' }>) => (b.head.length ? { head: b.head, rows: b.rows } : { head: b.rows[0] ?? [], rows: b.rows.slice(1) });
export const chapter = (hb: Handbook, no: number) => hb.chapters.find((c) => c.no === no);
export const firstTable = (c?: HBChapter) => c?.blocks.find((b): b is Extract<HBBlock, { type: 'table' }> => b.type === 'table');

// 纯文字（搜索用）
export function blockText(b: HBBlock): string {
  if (b.type === 'h' || b.type === 'p') return b.text;
  if (b.type === 'table') return [...b.head, ...b.rows.flat()].join(' ');
  return b.items.join(' ');
}

// 「问手册」：按问题里的字词在每一段里出现多少来排序（双字词比单字重要），回传最相关的几段
export function askHandbook(hb: Handbook, q: string, limit = 4) {
  const s = q.replace(/[\s，。？?！!、]/g, '');
  if (!s) return [];
  const grams = new Set<string>();
  for (let i = 0; i < s.length; i++) { grams.add(s[i]); if (i < s.length - 1) grams.add(s.slice(i, i + 2)); }
  const hits: { ch: HBChapter; text: string; score: number }[] = [];
  for (const ch of hb.chapters) {
    const pieces: string[] = [];
    for (const b of ch.blocks) {
      if (b.type === 'table') { const t = tableRows(b); t.rows.forEach((r) => pieces.push(r.map((c, i) => (t.head[i] ? `${t.head[i]}：${c}` : c)).filter(Boolean).join('　'))); }
      else if (b.type === 'ol' || b.type === 'ul') b.items.forEach((x) => pieces.push(x));
      else pieces.push(b.text);
    }
    for (const text of pieces) {
      let score = 0;
      for (const g of grams) if (text.includes(g) || ch.title.includes(g)) score += g.length === 2 ? 3 : 1;
      if (score > 0) hits.push({ ch, text, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

// 每周 / 每月要做的事：从手册第 7、16 章自动整理成勾选清单
export type CheckList = { id: string; title: string; when: string; steps: string[]; due: (d: Date) => boolean; period: (d: Date) => string };
const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((+t - +y0) / 864e5 + 1) / 7)).padStart(2, '0')}`;
};
const month = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function checklists(hb: Handbook): CheckList[] {
  const out: CheckList[] = [];
  const c7 = chapter(hb, 7);
  const ol7 = c7?.blocks.find((b): b is Extract<HBBlock, { type: 'ol' }> => b.type === 'ol');
  if (ol7) out.push({ id: 'weekly-overdue', title: '超期处理', when: '每周五或周六（全部技术单回传五行后）', steps: ol7.items, due: (d) => d.getDay() === 5 || d.getDay() === 6, period: isoWeek });
  const c16 = chapter(hb, 16);
  if (c16) {
    const groups: Record<string, string[]> = {};
    let cur = '', sub = '';
    for (const b of c16.blocks) {
      if (b.type === 'h') { const m = b.text.match(/(\d+)号/); if (m) { cur = m[1]; sub = ''; } else sub = b.text; continue; }
      if (!cur) continue;
      if (b.type === 'ol') (groups[cur] ||= []).push(...b.items.map((x) => (sub ? `【${sub}】${x}` : x)));
    }
    const name: Record<string, string> = { '10': '督导统计（房补、督导工资、服务费）', '15': '陆泳丞统计', '25': '长沙统计' };
    for (const day of ['10', '15', '25']) if (groups[day]) out.push({ id: `monthly-${day}`, title: name[day], when: `每月 ${day} 号`, steps: groups[day], due: (d) => d.getDate() === Number(day), period: month });
  }
  return out;
}

// 打勾纪录（云端共用：一个人勾了，其他客服也看到）
export type CheckRow = { list: string; period: string; step: number; done_by: string | null };
export function useChecks(enabled: boolean) {
  const [rows, setRows] = useState<CheckRow[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const sb = cloud();
    const load = () => void sb.from('cs_checks').select('list,period,step,done_by').then(({ data }) => setRows((data as CheckRow[]) ?? []));
    load();
    const ch = sb.channel('cs-checks').on('postgres_changes', { event: '*', schema: 'public', table: 'cs_checks' }, load).subscribe();
    return () => { void sb.removeChannel(ch); };
  }, [enabled]);
  const toggle = async (list: string, period: string, step: number, by: string) => {
    const has = rows.some((r) => r.list === list && r.period === period && r.step === step);
    const sb = cloud().from('cs_checks');
    setRows((rs) => (has ? rs.filter((r) => !(r.list === list && r.period === period && r.step === step)) : [...rs, { list, period, step, done_by: by }]));
    const { error } = has ? await sb.delete().match({ list, period, step }) : await sb.insert({ list, period, step, done_by: by });
    if (error) window.dispatchEvent(new CustomEvent('live-error', { detail: error.message }));
  };
  return { rows, toggle };
}
