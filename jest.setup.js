/* eslint-env jest */
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image, ScrollView } = require('react-native');
  const mockEasingFn = (t) => t;
  const Easing = {
    linear: mockEasingFn,
    ease: mockEasingFn,
    quad: mockEasingFn,
    cubic: mockEasingFn,
    poly: () => mockEasingFn,
    sin: mockEasingFn,
    circle: mockEasingFn,
    exp: mockEasingFn,
    elastic: () => mockEasingFn,
    back: () => mockEasingFn,
    bounce: mockEasingFn,
    bezier: () => mockEasingFn,
    in: (f) => f || mockEasingFn,
    out: (f) => f || mockEasingFn,
    inOut: (f) => f || mockEasingFn,
  };

  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      ScrollView,
      createAnimatedComponent: (c) => c,
    },
    View,
    Text,
    Image,
    ScrollView,
    createAnimatedComponent: (c) => c,
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: (cb) => (typeof cb === 'function' ? cb() || {} : {}),
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withSequence: (...anims) => anims[0],
    withDelay: (_, anim) => anim,
    interpolate: (val) => val,
    interpolateColor: (val, _, output) => output[0],
    Easing,
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    setUpTests: jest.fn(),
  };
});

jest.mock('react-native-worklets', () => ({}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Shared Mock Router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
  setParams: jest.fn(),
};

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  useSegments: () => ['(tabs)'],
  Link: ({ children }) => children,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
}));

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-device-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

// Mock Expo Fonts & Assets
jest.mock('expo-font', () => ({
  isLoaded: jest.fn().mockReturnValue(true),
  loadAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn().mockReturnValue({ downloadAsync: jest.fn(), uri: 'mock-uri' }),
  },
}));

// Mock Expo Vector Icons (including subpaths)
const createMockIcon = (defaultName) => {
  const { Text } = require('react-native');
  const Component = (props) => (
    <Text testID={`icon-${props.name || defaultName}`}>{props.name || defaultName}</Text>
  );
  Component.loadAsync = jest.fn().mockResolvedValue(true);
  return Component;
};

jest.mock('@expo/vector-icons', () => ({
  Ionicons: createMockIcon('Ionicons'),
  MaterialIcons: createMockIcon('MaterialIcons'),
  MaterialCommunityIcons: createMockIcon('MaterialCommunityIcons'),
  FontAwesome: createMockIcon('FontAwesome'),
  Feather: createMockIcon('Feather'),
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => createMockIcon('MaterialIcons'));
jest.mock('@expo/vector-icons/Ionicons', () => createMockIcon('Ionicons'));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => createMockIcon('MaterialCommunityIcons'));
jest.mock('@expo/vector-icons/FontAwesome', () => createMockIcon('FontAwesome'));
jest.mock('@expo/vector-icons/Feather', () => createMockIcon('Feather'));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock Expo Linear Gradient
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }) => <View {...props}>{children}</View>,
  };
});

// Mock Expo Image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return {
    Image: ({ children, ...props }) => <Image {...props}>{children}</Image>,
  };
});

// Mock Background Fetch & Task Manager
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3,
  },
  setMinimumIntervalAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  isTaskDefined: jest.fn().mockReturnValue(false),
  defineTask: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}));

// Track and cleanup dangling timers to avoid require after Jest teardown
const _origSetTimeout = global.setTimeout;
const _activeTimers = new Set();
global.setTimeout = (fn, ms, ...args) => {
  const id = _origSetTimeout((...cbArgs) => {
    _activeTimers.delete(id);
    fn(...cbArgs);
  }, ms, ...args);
  _activeTimers.add(id);
  return id;
};

afterAll(() => {
  for (const id of _activeTimers) {
    global.clearTimeout(id);
  }
  _activeTimers.clear();
});

// Mock useTheme
jest.mock('./theme', () => {
  const actual = jest.requireActual('./theme');
  const colors = require('./constants/colors').lightColors;
  return {
    ...actual,
    useTheme: () => ({
      mode: 'light',
      isDark: false,
      colors,
      styles: {},
      gradients: { primary: ['#6750A4', '#4F378B'] },
      elevations: {
        level0: {},
        level1: {},
        level2: {},
        level3: {},
        level4: {},
        level5: {},
      },
      spacing: actual.SPACING,
      radius: actual.RADIUS,
      iconSizes: actual.ICON_SIZES,
      toggle: jest.fn(),
      toggleTheme: jest.fn(),
    }),
  };
});

