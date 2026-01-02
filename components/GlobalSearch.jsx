import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import apiFetch from '../utils/apiFetch';
import apiConfig from '../config/apiConfig';

const GlobalSearch = ({ visible, onClose }) => {
    const router = useRouter();
    const { colors, styles } = useTheme();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);

    useEffect(() => {
        // Load recent searches from storage
        const loadRecentSearches = async () => {
            // Implementation with storage
        };
        loadRecentSearches();
    }, []);

    const handleSearch = async (searchQuery) => {
        if (searchQuery.trim().length < 2) return;

        setLoading(true);
        try {
            const response = await apiFetch(
                `${apiConfig.baseUrl}/search/global?q=${encodeURIComponent(searchQuery)}&limit=5`
            );
            if (response.ok) {
                const data = await response.json();
                setResults(data);

                // Add to recent searches
                setRecentSearches(prev => {
                    const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
                    // Save to storage
                    return updated;
                });
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim().length >= 2) {
                handleSearch(query);
            } else {
                setResults(null);
            }
        }, 300); // Debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    const navigateToResult = (type, item) => {
        onClose();
        switch (type) {
            case 'users':
                if (item.role === 'student') {
                    router.push(`/admin`);
                } else if (item.role === 'teacher') {
                    router.push(`/admin`);
                }
                break;
            case 'exams':
                router.push('/admin/exam-schedule');
                break;
            case 'complaints':
                router.push('/complaints');
                break;
            case 'events':
                router.push('/events');
                break;
        }
    };

    const renderResultItem = (type, item) => {
        let title, subtitle, icon;

        switch (type) {
            case 'users':
                title = item.name;
                subtitle = `${item.role} • ${item.email || item.phone}`;
                icon = item.role === 'student' ? 'person' : 'person-outline';
                break;
            case 'classes':
                title = `${item.name} ${item.section || ''}`;
                subtitle = `Class Teacher: ${item.classTeacher?.name || 'Not assigned'}`;
                icon = 'class';
                break;
            case 'subjects':
                title = item.name;
                subtitle = `${item.class?.name} ${item.class?.section || ''}`;
                icon = 'menu-book';
                break;
            case 'exams':
                title = item.name;
                subtitle = `${item.subject?.name} • ${new Date(item.examDate).toLocaleDateString()}`;
                icon = 'event';
                break;
            case 'complaints':
                title = item.title;
                subtitle = `by ${item.student?.name} • ${item.status}`;
                icon = 'feedback';
                break;
            case 'events':
                title = item.title;
                subtitle = new Date(item.date).toLocaleDateString();
                icon = 'event-available';
                break;
        }

        return (
            <Pressable
                key={item._id}
                onPress={() => navigateToResult(type, item)}
                style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
                    borderRadius: 12
                })}
            >
                <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: colors.primaryContainer,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                }}>
                    <MaterialIcons name={icon} size={20} color={colors.onPrimaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                        {title}
                    </Text>
                    {subtitle && (
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 2 }}>
                            {subtitle}
                        </Text>
                    )}
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
        );
    };

    const renderCategoryResults = (type, items, label) => {
        if (!items || items.length === 0) return null;

        return (
            <View key={type} style={{ marginBottom: 16 }}>
                <Text style={{
                    fontSize: 12,
                    fontFamily: 'DMSans-Bold',
                    color: colors.onSurfaceVariant,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    paddingHorizontal: 16
                }}>
                    {label} ({items.length})
                </Text>
                {items.map(item => renderResultItem(type, item))}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                {/* Header with Search Bar */}
                <View style={{
                    paddingTop: 50,
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                    backgroundColor: colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.outline
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.surfaceContainerHighest,
                        borderRadius: 28,
                        paddingHorizontal: 16,
                        height: 56
                    }}>
                        <MaterialIcons name="search" size={24} color={colors.onSurfaceVariant} />
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 16,
                                fontFamily: 'DMSans-Regular',
                                color: colors.onSurface,
                                marginLeft: 12,
                                marginRight: 8
                            }}
                            placeholder="Search students, exams, complaints..."
                            placeholderTextColor={colors.onSurfaceVariant}
                            value={query}
                            onChangeText={setQuery}
                            autoFocus
                        />
                        {query.length > 0 && (
                            <Pressable onPress={() => setQuery('')}>
                                <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
                            </Pressable>
                        )}
                        <Pressable onPress={onClose} style={{ marginLeft: 12 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.primary }}>
                                Cancel
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Results */}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                    {loading ? (
                        <View style={{ alignItems: 'center', padding: 40 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ marginTop: 16, color: colors.onSurfaceVariant }}>Searching...</Text>
                        </View>
                    ) : results ? (
                        <>
                            {results.totalResults === 0 ? (
                                <View style={{ alignItems: 'center', padding: 40 }}>
                                    <MaterialIcons name="search-off" size={64} color={colors.onSurfaceVariant} />
                                    <Text style={{ marginTop: 16, fontSize: 16, fontFamily: 'DMSans-Medium', color: colors.onSurface }}>
                                        No results found
                                    </Text>
                                    <Text style={{ marginTop: 8, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                                        Try different keywords
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {renderCategoryResults('users', results.results.users, 'People')}
                                    {renderCategoryResults('classes', results.results.classes, 'Classes')}
                                    {renderCategoryResults('subjects', results.results.subjects, 'Subjects')}
                                    {renderCategoryResults('exams', results.results.exams, 'Exams')}
                                    {renderCategoryResults('complaints', results.results.complaints, 'Complaints')}
                                    {renderCategoryResults('events', results.results.events, 'Events')}
                                </>
                            )}
                        </>
                    ) : recentSearches.length > 0 ? (
                        <View>
                            <Text style={{
                                fontSize: 12,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurfaceVariant,
                                textTransform: 'uppercase',
                                marginBottom: 12
                            }}>
                                Recent Searches
                            </Text>
                            {recentSearches.map((search, index) => (
                                <Pressable
                                    key={index}
                                    onPress={() => setQuery(search)}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        padding: 12,
                                        backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
                                        borderRadius: 12
                                    })}
                                >
                                    <MaterialIcons name="history" size={20} color={colors.onSurfaceVariant} />
                                    <Text style={{
                                        flex: 1,
                                        fontSize: 15,
                                        fontFamily: 'DMSans-Regular',
                                        color: colors.onSurface,
                                        marginLeft: 12
                                    }}>
                                        {search}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', padding: 40 }}>
                            <MaterialIcons name="search" size={64} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                            <Text style={{ marginTop: 16, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                                Start typing to search
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
};

export default GlobalSearch;
