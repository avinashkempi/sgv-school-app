// 1. Define background tasks globally before Expo Router initializes.
// This guarantees that TaskManager.defineTask is always evaluated and registered
// in memory whenever Android or iOS launches a headless JS environment for background execution.
import "./utils/backgroundSync";

// 2. Initialize Expo Router routing and root component.
// Must be imported after background task definitions.
import "expo-router/entry";
