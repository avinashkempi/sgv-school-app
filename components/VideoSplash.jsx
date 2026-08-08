import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, StatusBar, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const videoAsset = require('../assets/SGV Logo Video.mp4');

export default function VideoSplash({ onFinish }) {
  const isFinished = useRef(false);

  const handleFinish = () => {
    if (!isFinished.current) {
      isFinished.current = true;
      onFinish();
    }
  };

  const player = useVideoPlayer(videoAsset, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      handleFinish();
    });

    // Fallback timer (e.g. 10s max) in case video event doesn't trigger on some devices
    const timer = setTimeout(() => {
      handleFinish();
    }, 12000);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [player]);

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <VideoView
        style={styles.video}
        player={player}
        showsTimecodes={false}
        nativeControls={false}
        contentFit="cover"
        allowsFullscreen={false}
      />
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleFinish}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
