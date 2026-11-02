import { Placeholder } from '@/components/placeholder';
import { useT } from '@/lib/i18n';

// react-native-maps has no web implementation; the app targets iOS and Android.
export default function CatMapScreen() {
  const t = useT();
  return <Placeholder icon={{ web: 'map' }} title={t.capture.mapAppOnly} body={t.cats.mapEmptyBody} />;
}
