import type { HairStyle, Look, Person } from '../types';

const SKINS = ['#F1C9A5', '#F5D6BA', '#E0AC83', '#C68B5E', '#D9A07A', '#8D5524'];
const HAIRS: HairStyle[] = ['short', 'long', 'spiky', 'bun', 'ponytail', 'side', 'bob', 'short'];
const HAIR_COLORS = ['#1B1B1F', '#22201E', '#3B2A20', '#5A3B26', '#7A5A3A'];
const TOPS = ['#1A73E8', '#34A853', '#FBBC04', '#EA4335', '#A142F4', '#12B5CB', '#FFFFFF', '#3C4043', '#F29900', '#E8EAED'];
const BOTTOMS = ['#3C4043', '#202124', '#5F6368', '#1F3A5F'];
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// 没指定外观的员工：按 id 配一套固定的（每次看都一样）
export function lookOf(p: Pick<Person, 'id' | 'dept' | 'look'>): Look {
  if (p.look) return p.look;
  const h = hash(p.id);
  return {
    skin: SKINS[h % SKINS.length], hair: HAIRS[(h >> 3) % HAIRS.length], hairColor: HAIR_COLORS[(h >> 6) % HAIR_COLORS.length],
    top: TOPS[(h >> 9) % TOPS.length], bottom: BOTTOMS[(h >> 13) % BOTTOMS.length],
    headset: ['cs', 'complaint', 'orders', 'techsup'].includes(p.dept) || ((h >> 16) % 5 === 0),
    glasses: (h >> 19) % 4 === 0, tie: (h >> 22) % 7 === 0
  };
}

// 2D 头像（列表、对话、员工卡用）：跟 3D 方块小人同一套外观（AI 也一样，多一根天线）
const cache = new Map<string, string>();
export function avatarUrl(p: Pick<Person, 'id' | 'dept' | 'look' | 'type'>, size = 96): string {
  const key = p.id + size;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return '';
  const s = size / 96;
  {
    const L = lookOf(p);
    const ai = p.type === 'ai';
    g.fillStyle = ai ? '#F3E8FD' : '#E8F0FE'; g.beginPath(); g.arc(48 * s, 48 * s, 48 * s, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(48 * s, 48 * s, 48 * s, 0, Math.PI * 2); g.clip();
    g.fillStyle = L.top; roundRect(g, 18 * s, 74 * s, 60 * s, 40 * s, 12 * s); g.fill();
    g.fillStyle = L.skin; roundRect(g, 26 * s, 24 * s, 44 * s, 48 * s, 14 * s); g.fill();
    g.fillStyle = L.hairColor;
    if (L.hair !== 'bald') { roundRect(g, 24 * s, 16 * s, 48 * s, 18 * s, 9 * s); g.fill(); }
    if (L.hair === 'long' || L.hair === 'bob') { roundRect(g, 22 * s, 22 * s, 9 * s, L.hair === 'long' ? 46 * s : 32 * s, 4 * s); g.fill(); roundRect(g, 65 * s, 22 * s, 9 * s, L.hair === 'long' ? 46 * s : 32 * s, 4 * s); g.fill(); }
    if (L.hair === 'bun') { g.beginPath(); g.arc(48 * s, 13 * s, 9 * s, 0, Math.PI * 2); g.fill(); }
    if (L.hair === 'spiky') for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo((26 + i * 10) * s, 20 * s); g.lineTo((31 + i * 10) * s, 8 * s); g.lineTo((36 + i * 10) * s, 20 * s); g.fill(); }
    g.fillStyle = '#202124';
    g.beginPath(); g.ellipse(39 * s, 46 * s, 3.2 * s, 4.2 * s, 0, 0, Math.PI * 2); g.ellipse(57 * s, 46 * s, 3.2 * s, 4.2 * s, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#202124'; g.lineWidth = 2.4 * s; g.lineCap = 'round';
    g.beginPath(); g.arc(48 * s, 54 * s, 8 * s, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    if (L.glasses) { g.lineWidth = 2 * s; g.strokeRect(32 * s, 40 * s, 14 * s, 11 * s); g.strokeRect(50 * s, 40 * s, 14 * s, 11 * s); }
    if (L.headset) { g.strokeStyle = '#3C4043'; g.lineWidth = 4 * s; g.beginPath(); g.arc(48 * s, 44 * s, 25 * s, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.fillStyle = '#3C4043'; roundRect(g, 19 * s, 40 * s, 8 * s, 14 * s, 3 * s); g.fill(); roundRect(g, 69 * s, 40 * s, 8 * s, 14 * s, 3 * s); g.fill(); }
    // AI 员工：同一个小人，头顶多一根发光天线
    if (ai) { g.fillStyle = '#5F6368'; g.fillRect(54 * s, 4 * s, 3 * s, 14 * s); g.fillStyle = '#12B5CB'; g.beginPath(); g.arc(55.5 * s, 5 * s, 4.5 * s, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
