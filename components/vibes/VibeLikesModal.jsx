import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import { CACHE_TIERS } from '../../utils/cacheConfig';

export default function VibeLikesModal({ visible, onClose, vibeId }) {
  const { colors } = useTheme();

  const { data, isLoading } = useApiQuery(
    ['vibeLikes', vibeId],
    vibeId ? `${apiConfig.baseUrl}${apiConfig.endpoints.vibes.getLikes(vibeId)}` : null,
    {
      ...CACHE_TIERS.REAL_TIME,
      enabled: !!vibeId && visible,
    }
  );

  const users = data?.data || [];

  const renderUserItem = useCallback(({ item }) => {
    const roleText = item.role === 'student'
      ? (item.currentClass?.name ? `Student • ${item.currentClass.name}` : 'Student')
      : item.role === 'teacher'
      ? (item.designation ? `Teacher • ${item.designation}` : 'Teacher')
      : item.role === 'admin' || item.role === 'super admin'
      ? 'Administrator'
      : item.role;

    return (
      <View style={styles.userRow}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>
            {item.name ? item.name[0].toUpperCase() : 'U'}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: colors.onSurface }]}>
            {item.name}
          </Text>
          <Text style={[styles.userRole, { color: colors.onSurfaceVariant }]}>
            {roleText}
          </Text>
        </View>
        <MaterialIcons name="favorite" size={16} color="#FF2D55" />
      </View>
    );
  }, [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Likes</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* List */}
          {isLoading && users.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                No likes yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    minHeight: '40%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans-Bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'DMSans-Regular',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
  },
  userRole: {
    fontSize: 12,
    fontFamily: 'DMSans-Regular',
  },
});
