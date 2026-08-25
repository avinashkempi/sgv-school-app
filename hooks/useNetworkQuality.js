import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook to inspect network quality and connection speed.
 * Helps media components seamlessly downscale resolutions on 2G/3G or slow internet.
 */
export function useNetworkQuality() {
  const [networkInfo, setNetworkInfo] = useState({
    isConnected: true,
    isInternetReachable: true,
    isSlow: false,
    connectionType: 'wifi',
  });

  useEffect(() => {
    const checkState = (state) => {
      const isConnected = !!state.isConnected;
      const isInternetReachable = state.isInternetReachable !== false;
      const connectionType = state.type || 'unknown';
      const cellularGen = state.details?.cellularGeneration; // '2g' | '3g' | '4g' | '5g'

      const isSlow = !isConnected ||
        cellularGen === '2g' ||
        cellularGen === '3g' ||
        (connectionType === 'cellular' && !cellularGen);

      setNetworkInfo({
        isConnected,
        isInternetReachable,
        isSlow,
        connectionType,
        cellularGen,
      });
    };

    NetInfo.fetch().then(checkState);
    const unsubscribe = NetInfo.addEventListener(checkState);
    return () => unsubscribe();
  }, []);

  return networkInfo;
}

export default useNetworkQuality;
