const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enable full R8 optimizations & optimized resource shrinking
 * addressing Google Play Console performance and memory recommendations.
 */
const withR8Optimizations = (config) => {
  return withGradleProperties(config, (config) => {
    const propertiesToSet = [
      // Enable R8 full mode optimization (aggressive inlining, devirtualization, class merging)
      { key: 'android.enableR8.fullMode', value: 'true' },
      // Enable AGP precise / optimized resource shrinking
      { key: 'android.r8.optimizedResourceShrinking', value: 'true' },
      // Enable resource optimizations
      { key: 'android.enableResourceOptimizations', value: 'true' },
      // Required for precise resource shrinking
      { key: 'android.nonFinalResIds', value: 'true' },
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
};

module.exports = withR8Optimizations;
