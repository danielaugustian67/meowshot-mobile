// expo-router lists these for a drawer navigator this app doesn't use, and the JS bundle never loads them.
// Leaving their native code out saves about 3 MB per CPU architecture.
const unused = { platforms: { android: null, ios: null } };

module.exports = {
  dependencies: {
    'react-native-gesture-handler': unused,
    'react-native-reanimated': unused,
    'react-native-worklets': unused,
  },
};
