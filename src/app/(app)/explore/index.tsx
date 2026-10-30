import { Placeholder } from '@/components/placeholder';
import { useT } from '@/lib/i18n';

export default function ExploreScreen() {
  const t = useT();
  return <Placeholder icon={{ ios: 'safari', android: 'explore', web: 'explore' }} title={t.placeholder.explore} body={t.common.comingSoon} />;
}
