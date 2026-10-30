import { Placeholder } from '@/components/placeholder';
import { useT } from '@/lib/i18n';

export default function FeedScreen() {
  const t = useT();
  return <Placeholder icon={{ ios: 'house.fill', android: 'home', web: 'home' }} title={t.placeholder.feed} body={t.common.comingSoon} />;
}
