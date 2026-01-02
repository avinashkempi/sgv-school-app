import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

/**
 * YearSelector Component
 * Reusable dropdown for selecting academic year across all dashboards
 * 
 * @param {Object} currentYear - Currently selected year
 * @param {Array} availableYears - All years user can access
 * @param {Function} onYearChange - Callback when year is selected
 * @param {String} userRole - User's role (determines visibility)
 * @param {Boolean} showAll - Show "All Years" option
 */
export default function YearSelector({
    currentYear,
    availableYears = [],
    onYearChange,
    userRole,
    showAll = false
}) {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);

    // Filter years based on role
    const accessibleYears = React.useMemo(() => {
        if (userRole === 'super admin' || userRole === 'super-admin') {
            return availableYears; // Super admin sees all
        }

        if (userRole === 'admin' || userRole === 'teacher') {
            // Admin/Teacher see current + past 2 years
            const sortedYears = [...availableYears].sort((a, b) =>
                new Date(b.startDate) - new Date(a.startDate)
            );
            return sortedYears.slice(0, 3);
        }

        // Students see only their enrolled years
        return availableYears.filter(y => y.isActive);
    }, [availableYears, userRole]);

    const getYearStatus = (year) => {
        if (year.isActive || year.status === 'current') return 'Current';
        if (year.status === 'archived') return 'Archived';
        if (year.status === 'draft') return 'Upcoming';
        return '';
    };

    const getStatusColor = (year) => {
        if (year.isActive || year.status === 'current') return colors.success;
        if (year.status === 'archived') return colors.onSurfaceVariant;
        if (year.status === 'draft') return colors.primary;
        return colors.onSurface;
    };

    const getStatusIcon = (year) => {
        if (year.isActive || year.status === 'current') return 'check-circle';
        if (year.status === 'archived') return 'archive';
        if (year.status === 'draft') return 'schedule';
        return 'circle';
    };

    if (accessibleYears.length === 0) {
        return null;
    }

    return (
        <View style={{ position: 'relative', zIndex: 1000 }}>
            {/* Selector Button */}
            <Pressable
                onPress={() => setIsOpen(!isOpen)}
                style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: pressed ? colors.primaryContainer : colors.surfaceContainerHigh,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isOpen ? colors.primary : colors.outlineVariant
                })}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <MaterialIcons
                        name="date-range"
                        size={20}
                        color={colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={{
                            fontSize: 13,
                            fontFamily: 'DMSans-Medium',
                            color: colors.onSurfaceVariant,
                            marginBottom: 2
                        }}>
                            Academic Year
                        </Text>
                        <Text style={{
                            fontSize: 15,
                            fontFamily: 'DMSans-Bold',
                            color: colors.onSurface
                        }}>
                            {currentYear?.name || 'Select Year'}
                        </Text>
                    </View>
                </View>
                <MaterialIcons
                    name={isOpen ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={colors.onSurface}
                />
            </Pressable>

            {/* Dropdown Menu */}
            {isOpen && (
                <View style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.outlineVariant,
                    elevation: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    maxHeight: 300,
                    overflow: 'hidden'
                }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {showAll && (
                            <Pressable
                                onPress={() => {
                                    onYearChange(null);
                                    setIsOpen(false);
                                }}
                                style={({ pressed }) => ({
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    backgroundColor: !currentYear && pressed
                                        ? colors.primaryContainer
                                        : !currentYear
                                            ? colors.secondaryContainer
                                            : pressed
                                                ? colors.surfaceContainerHigh
                                                : 'transparent',
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.outlineVariant
                                })}
                            >
                                <MaterialIcons
                                    name="all-inclusive"
                                    size={20}
                                    color={colors.primary}
                                    style={{ marginRight: 12 }}
                                />
                                <Text style={{
                                    fontSize: 14,
                                    fontFamily: 'DMSans-Bold',
                                    color: colors.onSurface,
                                    flex: 1
                                }}>
                                    All Years
                                </Text>
                            </Pressable>
                        )}

                        {accessibleYears.map((year) => {
                            const isSelected = currentYear?._id === year._id ||
                                currentYear?.id === year.id;
                            const status = getYearStatus(year);
                            const statusColor = getStatusColor(year);
                            const statusIcon = getStatusIcon(year);

                            return (
                                <Pressable
                                    key={year._id || year.id}
                                    onPress={() => {
                                        onYearChange(year);
                                        setIsOpen(false);
                                    }}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        backgroundColor: isSelected && pressed
                                            ? colors.primaryContainer
                                            : isSelected
                                                ? colors.secondaryContainer
                                                : pressed
                                                    ? colors.surfaceContainerHigh
                                                    : 'transparent'
                                    })}
                                >
                                    <MaterialIcons
                                        name={statusIcon}
                                        size={20}
                                        color={statusColor}
                                        style={{ marginRight: 12 }}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontSize: 15,
                                            fontFamily: 'DMSans-Bold',
                                            color: colors.onSurface
                                        }}>
                                            {year.name}
                                        </Text>
                                        {year.description && (
                                            <Text style={{
                                                fontSize: 12,
                                                fontFamily: 'DMSans-Regular',
                                                color: colors.onSurfaceVariant,
                                                marginTop: 2
                                            }}>
                                                {year.description}
                                            </Text>
                                        )}
                                    </View>
                                    {status && (
                                        <View style={{
                                            backgroundColor: statusColor + '20',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 6
                                        }}>
                                            <Text style={{
                                                fontSize: 11,
                                                fontFamily: 'DMSans-Bold',
                                                color: statusColor
                                            }}>
                                                {status}
                                            </Text>
                                        </View>
                                    )}
                                    {isSelected && (
                                        <MaterialIcons
                                            name="check"
                                            size={20}
                                            color={colors.primary}
                                            style={{ marginLeft: 8 }}
                                        />
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Overlay to close dropdown */}
            {isOpen && (
                <Pressable
                    onPress={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: -1
                    }}
                />
            )}
        </View>
    );
}
