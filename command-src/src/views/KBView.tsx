import { BookOpen, ExternalLink } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { ViewShell } from './ViewShell';

type Lib = { href: string; title: string; desc: string };

export function KBView() {
  const { t } = useLang();
  const lib = ((window.COMPANY as unknown as { library?: Lib[] } | undefined)?.library) ?? [];
  const tools: Lib[] = [
    { href: 'name/', title: '名字审核', desc: '名正言顺名册：核对新名、转繁体、下载结果。' },
    { href: 'tech/', title: '技术单审核', desc: '按规则标红、分文件、改页脚，下载给专家。' }
  ];
  return (
    <ViewShell title={t('kbTitle')} icon={<BookOpen className="size-5" />}>
      <p className="mb-4 text-xs text-muted">{t('kbHint')}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...lib, ...tools].map((x) => (
          <a key={x.href} href={`../${x.href}`} target="_blank" rel="noopener" className="group rounded-xl border border-line/10 bg-elevated/30 p-4 transition-colors hover:border-accent/40">
            <div className="flex items-center gap-2 text-sm font-semibold">{x.title}<ExternalLink className="ml-auto size-3.5 text-faint group-hover:text-accent" /></div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{x.desc}</p>
            <code className="mt-2 block font-mono text-2xs text-faint">/{x.href}</code>
          </a>
        ))}
      </div>
    </ViewShell>
  );
}
