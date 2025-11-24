import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Loader from './Loader';
import { subscribeLoading } from '../utils/loadingService';

export function LoadingProvider({ children }) {
  const [loadingCount, setLoadingCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeLoading((count) => setLoadingCount(count));
    return unsub;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {loadingCount > 0 && <Loader />}
    </View>
  );
}

export default LoadingProvider;
