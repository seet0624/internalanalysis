// 云端资料库（Supabase 免费版，新加坡机房）。
// 登入页（首页）验完密码会顺便登入云端，登入凭证存在浏览器；这里直接接着用。
// 公开钥匙（publishable key）本来就是给网页用的；谁能看什么，由资料库的权限规则（RLS）决定。
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const CLOUD_URL = 'https://xmtljgxdzhrptsazklls.supabase.co';
export const CLOUD_KEY = 'sb_publishable_Z9It450THGdFoj_FItrJOQ_HcWYA0lJ';

let client: SupabaseClient | null = null;
export function cloud(): SupabaseClient {
  if (!client) client = createClient(CLOUD_URL, CLOUD_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

// 跟网站登入是同一个人才用云端（换账号、登出后不会拿到上一个人的资料）
export async function cloudSession(account: string | undefined): Promise<{ role: string; account: string } | null> {
  if (!account) return null;
  try {
    const { data } = await cloud().auth.getSession();
    const meta = data.session?.user?.app_metadata as { role?: string; account?: string } | undefined;
    if (!data.session || !meta?.role || meta.account !== account) return null;
    return { role: meta.role, account: meta.account };
  } catch { return null; }
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
