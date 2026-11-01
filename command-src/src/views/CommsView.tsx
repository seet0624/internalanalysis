import { MessagesSquare } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { CommTabs, MessageList, useCommTab } from '../components/Messages';
import { ViewShell } from './ViewShell';

export function CommsView() {
  const { t } = useLang();
  const [tab, setTab] = useCommTab('company');
  return (
    <ViewShell title={t('comm_title')} icon={<MessagesSquare className="size-5" />} actions={<CommTabs tab={tab} setTab={setTab} />}>
      <div className="-mx-4 -mt-4"><MessageList tab={tab} /></div>
    </ViewShell>
  );
}
