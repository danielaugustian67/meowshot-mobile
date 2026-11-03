import { Platform } from 'react-native';

/** Stack options for the web header, which otherwise puts `headerRight` flush against the edge of the screen. */
export const webHeaderOptions = Platform.select<object>({
  web: { headerRightContainerStyle: { paddingEnd: 16 } },
  default: {},
});
