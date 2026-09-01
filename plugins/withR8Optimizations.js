const { withGradleProperties, withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to resolve Google Play Console recommendations:
 * 1. Full R8 optimizations & AGP optimized resource shrinking
 * 2. Bitmap image performance & AAPT2 PNG crunching
 * 3. Android 15/16 native Edge-to-Edge compliance (transparent system bars, cutout mode, and removal of deprecated flags)
 */
const withR8Optimizations = (config) => {
  // 1. Configure Gradle Properties for R8 & Resource Optimization
  config = withGradleProperties(config, (config) => {
    const propertiesToSet = [
      // Enable R8 full mode optimization (aggressive inlining, devirtualization, class merging)
      { key: 'android.enableR8.fullMode', value: 'true' },
      // Enable AGP precise / optimized resource shrinking
      { key: 'android.r8.optimizedResourceShrinking', value: 'true' },
      // Enable resource optimizations
      { key: 'android.enableResourceOptimizations', value: 'true' },
      // Required for precise resource shrinking
      { key: 'android.nonFinalResIds', value: 'true' },
      // Enable AAPT2 PNG crunching in release builds for bitmap optimization
      { key: 'android.enablePngCrunchInReleaseBuilds', value: 'true' },
    ];

    propertiesToSet.forEach(({ key, value }) => {
      const index = config.modResults.findIndex(
        (item) => item.type === 'property' && item.key === key
      );

      if (index !== -1) {
        config.modResults[index].value = value;
      } else {
        config.modResults.push({
          type: 'property',
          key,
          value,
        });
      }
    });

    return config;
  });

  // 2. Configure Android Styles for Edge-to-Edge compliance without deprecated parameters
  config = withAndroidStyles(config, (config) => {
    const styleParent = { name: 'AppTheme' };

    // Set transparent status bar and navigation bar
    config.modResults = AndroidConfig.Styles.setStylesItem({
      xml: config.modResults,
      parent: styleParent,
      item: { $: { name: 'android:statusBarColor' }, _: '@android:color/transparent' },
    });

    config.modResults = AndroidConfig.Styles.setStylesItem({
      xml: config.modResults,
      parent: styleParent,
      item: { $: { name: 'android:navigationBarColor' }, _: '@android:color/transparent' },
    });

    // Support edge-to-edge camera cutout display
    config.modResults = AndroidConfig.Styles.setStylesItem({
      xml: config.modResults,
      parent: styleParent,
      item: { $: { name: 'android:windowLayoutInDisplayCutoutMode' }, _: 'shortEdges' },
    });

    // Disable legacy system bar contrast enforcement (allows full custom edge-to-edge rendering)
    config.modResults = AndroidConfig.Styles.setStylesItem({
      xml: config.modResults,
      parent: styleParent,
      item: { $: { name: 'android:enforceStatusBarContrast' }, _: 'false' },
    });

    config.modResults = AndroidConfig.Styles.setStylesItem({
      xml: config.modResults,
      parent: styleParent,
      item: { $: { name: 'android:enforceNavigationBarContrast' }, _: 'false' },
    });

    // Remove any deprecated edge-to-edge opt-out or legacy fitsSystemWindows attributes
    config.modResults = AndroidConfig.Styles.removeStylesItem({
      xml: config.modResults,
      parent: styleParent,
      name: 'android:fitsSystemWindows',
    });

    config.modResults = AndroidConfig.Styles.removeStylesItem({
      xml: config.modResults,
      parent: styleParent,
      name: 'android:windowOptOutEdgeToEdgeEnforcement',
    });

    return config;
  });

  return config;
};

module.exports = withR8Optimizations;
