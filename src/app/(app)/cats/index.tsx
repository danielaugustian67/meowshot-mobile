import { Placeholder } from '@/components/placeholder';
import { useT } from '@/lib/i18n';

export default function CatsScreen() {
  const t = useT();
  return <Placeholder icon={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }} title={t.placeholder.cats} body={t.common.comingSoon} />;
}
