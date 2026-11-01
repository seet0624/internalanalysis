// 「功能」清单：客服一打开就看到能用的东西，点了直接用。
// 审核工具、资料都来自 hq/company.js（跟首页同一份）；Claude 助手是各部门名单里有 skill 的员工。
import type { L } from '../types';
import type { HQEvent } from './company';
import { describeEvent } from './company';

export type FeatureGroup = 'review' | 'docs' | 'claude' | 'dept';
export type Feature = {
  id: string; group: FeatureGroup; name: L; desc: L;
  href?: string; skill?: string; tool?: 'name' | 'tech';
  steps?: L[]; owner?: L;
};

type HQAgent = { name: string; role: string; duty?: string; skill?: string };
type HQTeam = { id: string; name: string; kind: string; href?: string; summary?: string; agents: HQAgent[]; teams?: HQTeam[] };
type HQCompany = { departments: HQTeam[]; library?: { href: string; title: string; desc: string }[] };

const REVIEW: Record<string, Pick<Feature, 'name' | 'desc' | 'steps' | 'tool'>> = {
  name: {
    tool: 'name',
    name: { zh: '名字审核', en: 'Name Review' },
    desc: { zh: '名正言顺技术单：逐位学员核对新名（撞字、撞音、不雅谐音），转繁体，下载结果。', en: 'Roster review: check each new name, convert to Traditional, download results.' },
    steps: [{ zh: '上传名正言顺技术单', en: 'Upload the naming order sheet' }, { zh: '看每位学员的结果', en: 'Review each student' }, { zh: '下载结果文件', en: 'Download the result' }]
  },
  tech: {
    tool: 'tech',
    name: { zh: '技术单审核', en: 'Order Review' },
    desc: { zh: '技术单按规则自动标红、分文件、改页脚，要问下单者的单整理好话术。', en: 'Flag orders by rule, split files, fix footers, prepare customer follow-ups.' },
    steps: [{ zh: '上传技术单 Excel', en: 'Upload the order Excel' }, { zh: '看标红和待办', en: 'Check flags and to-dos' }, { zh: '下载给专家', en: 'Download for experts' }]
  }
};

const DOC_EN: Record<string, L> = {
  'handbook/': { zh: '数易 · 客服业务门户', en: 'Shuyi CS Handbook' },
  'guide/': { zh: '工具启动教程', en: 'Tool Setup Guide' },
  'docs/dongfang/': { zh: '东方药林健康商城 · 手机端教程', en: 'Dongfang Health Mall · Mobile Guide' },
  'numera/': { zh: 'SHUYI · NUMERA', en: 'SHUYI · NUMERA' }
};

export function buildFeatures(role: 'boss' | 'cs' | 'guest'): Feature[] {
  const c = (window.COMPANY as unknown as HQCompany | undefined);
  const out: Feature[] = [];
  const cs = c?.departments.find((d) => d.id === 'cs');
  for (const t of cs?.teams ?? []) {
    if (t.kind === 'site' && t.href) {
      const r = REVIEW[t.id];
      out.push({ id: `tool-${t.id}`, group: 'review', href: `../${t.href}`, ...(r ?? { name: { zh: t.name, en: t.name }, desc: { zh: t.summary ?? '', en: t.summary ?? '' } }) });
    }
    if (t.kind === 'claude') {
      for (const a of t.agents) if (a.skill) out.push({ id: `skill-${a.skill}`, group: 'claude', skill: a.skill, name: { zh: a.role, en: a.skill.split(':')[1] ?? a.skill }, desc: { zh: a.duty ?? '', en: a.duty ?? '' }, owner: { zh: a.name, en: a.name } });
    }
  }
  for (const lib of c?.library ?? []) {
    out.push({ id: `doc-${lib.href}`, group: 'docs', href: `../${lib.href}`, name: DOC_EN[lib.href] ?? { zh: lib.title, en: lib.title }, desc: { zh: lib.desc, en: lib.desc } });
  }
  if (role === 'boss') {
    for (const d of c?.departments ?? []) {
      if (d.id === 'cs' || d.kind !== 'claude') continue;
      for (const a of d.agents) if (a.skill) out.push({ id: `skill-${a.skill}`, group: 'dept', skill: a.skill, name: { zh: `${d.name} · ${a.role}`, en: a.skill }, desc: { zh: a.duty ?? '', en: a.duty ?? '' }, owner: { zh: a.name, en: a.name } });
    }
  }
  return out;
}

// 审核工具上次用的情形（这台电脑的浏览器纪录）
export function lastRun(tool: 'name' | 'tech' | undefined, events: HQEvent[]) {
  if (!tool) return null;
  const e = [...events].reverse().find((x) => x.tool === tool && x.kind !== 'downloaded');
  return e ? { ago: (Date.now() - e.t) / 60000, text: describeEvent(e), today: events.filter((x) => x.tool === tool && x.kind !== 'downloaded' && new Date(x.t).toDateString() === new Date().toDateString()).length } : null;
}
