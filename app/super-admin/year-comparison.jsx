import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useApiQuery } from '../../hooks/useApi';
import apiConfig from '../../config/apiConfig';
import Header from '../../components/Header';
import PerformanceChart from '../../components/PerformanceChart';

/**
 * Year Comparison Screen
 * Compare multiple academic years side-by-side with analytics
 */
export default function YearComparisonScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [selectedYears, setSelectedYears] = useState([]);

    // Fetch all years
    const { data: allYears = [], isLoading: yearsLoading } = useApiQuery(
        ['allYears'],
        `${apiConfig.baseUrl}/academic-year`
    );

    // Fetch comparison data
    const yearIds = selectedYears.join(',');
    const { data: comparisonData, isLoading: comparisonLoading } = useApiQuery(
        ['yearComparison', yearIds],
        `${apiConfig.baseUrl}/academic-year/compare?years=${yearIds}`,
        { enabled: selectedYears.length >= 2 }
    );

    const toggleYearSelection = (yearId) => {
        setSelectedYears(prev => {
            if (prev.includes(yearId)) {
                return prev.filter(id => id !== yearId);
            } else {
                if (prev.length >= 5) {
                    return prev; // Max 5 years
                }
                return [...prev, yearId];
            }
        });
    };

    const renderYearSelector = () => (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                Select Years to Compare (2-5)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {allYears.map(year => {
                    const isSelected = selectedYears.includes(year._id);
                    return (
                        <Pressable
                            key={year._id}
                            onPress={() => toggleYearSelection(year._id)}
                            style={({ pressed }) => ({
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 10,
                                borderWidth: 2,
                                borderColor: isSelected ? colors.primary : colors.outlineVariant,
                                backgroundColor: isSelected
                                    ? (pressed ? colors.primaryContainer : colors.primary + '20')
                                    : (pressed ? colors.surfaceContainerHigh : 'transparent'),
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8
                            })}
                        >
                            {isSelected && (
                                <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                            )}
                            <Text style={{
                                fontSize: 13,
                                fontFamily: 'DMSans-Bold',
                                color: isSelected ? colors.primary : colors.onSurface
                            }}>
                                {year.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            {selectedYears.length > 0 && selectedYears.length < 2 && (
                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.error, marginTop: 8 }}>
                    Select at least 2 years to compare
                </Text>
            )}
        </View>
    );

    const renderComparisonTable = () => {
        if (!comparisonData?.years) return null;

        const years = comparisonData.years;
        const metrics = [
            { key: 'totalStudents', label: 'Students', icon: 'people' },
            { key: 'totalClasses', label: 'Classes', icon: 'class' },
            { key: 'totalExams', label: 'Exams', icon: 'school' },
            { key: 'totalSubjects', label: 'Subjects', icon: 'book' },
            { key: 'totalTeachers', label: 'Teachers', icon: 'person' },
            { key: 'averageAttendance', label: 'Avg Attendance', icon: 'how-to-reg', format: (v) => `${v?.toFixed(1) || 0}%` }
        ];

        return (
            <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                    Comparative Statistics
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                        {/* Header Row */}
                        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                            <View style={{ width: 140, paddingVertical: 10 }}>
                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: colors.onSurfaceVariant }}>
                                    Metric
                                </Text>
                            </View>
                            {years.map((year, index) => (
                                <View key={index} style={{ width: 100, paddingVertical: 10, paddingHorizontal: 8 }}>
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: colors.primary }}>
                                        {year.year}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Data Rows */}
                        {metrics.map((metric, metricIndex) => (
                            <View
                                key={metricIndex}
                                style={{
                                    flexDirection: 'row',
                                    backgroundColor: metricIndex % 2 === 0 ? colors.surfaceContainerLow : 'transparent',
                                    borderRadius: 8,
                                    marginBottom: 4
                                }}
                            >
                                <View style={{ width: 140, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <MaterialIcons name={metric.icon} size={16} color={colors.onSurfaceVariant} />
                                    <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onSurface }}>
                                        {metric.label}
                                    </Text>
                                </View>
                                {years.map((year, yearIndex) => {
                                    const value = year[metric.key];
                                    const displayValue = metric.format ? metric.format(value) : value;

                                    // Find max value for highlighting
                                    const allValues = years.map(y => y[metric.key] || 0);
                                    const maxValue = Math.max(...allValues);
                                    const isMax = value === maxValue && value > 0;

                                    return (
                                        <View key={yearIndex} style={{ width: 100, paddingVertical: 12, paddingHorizontal: 8, justifyContent: 'center' }}>
                                            <Text style={{
                                                fontSize: 15,
                                                fontFamily: 'DMSans-Bold',
                                                color: isMax ? colors.success : colors.onSurface
                                            }}>
                                                {displayValue || 'N/A'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderTrends = () => {
        if (!comparisonData?.trends) return null;

        const { trends } = comparisonData;

        return (
            <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                    Trends (Latest vs Previous)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <TrendCard
                        label="Students"
                        value={trends.studentsChange}
                        icon="people"
                        color={colors.primary}
                    />
                    <TrendCard
                        label="Attendance"
                        value={trends.attendanceChange}
                        icon="how-to-reg"
                        color={colors.success}
                        suffix="%"
                    />
                    <TrendCard
                        label="Exams"
                        value={trends.examsChange}
                        icon="school"
                        color={colors.secondary}
                    />
                </View>
            </View>
        );
    };

    const renderCharts = () => {
        if (!comparisonData?.years || comparisonData.years.length < 2) return null;

        const years = comparisonData.years;

        // Prepare data for line chart (student growth)
        const studentGrowthData = {
            labels: years.map(y => y.year),
            datasets: [{
                data: years.map(y => y.totalStudents || 0)
            }]
        };

        // Prepare data for bar chart (exams comparison)
        const examsData = {
            labels: years.map(y => y.year),
            datasets: [{
                data: years.map(y => y.totalExams || 0)
            }]
        };

        return (
            <View>
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                        Student Growth Trend
                    </Text>
                    <PerformanceChart
                        data={studentGrowthData}
                        type="line"
                        height={200}
                    />
                </View>

                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                        Exams Comparison
                    </Text>
                    <PerformanceChart
                        data={examsData}
                        type="bar"
                        height={200}
                    />
                </View>
            </View>
        );
    };

    if (yearsLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 100 }}>
                <Header
                    title="Compare Years"
                    subtitle="Multi-year analytics & insights"
                    showBack
                />

                <View style={{ marginTop: 20 }}>
                    {renderYearSelector()}

                    {selectedYears.length >= 2 && (
                        <>
                            {comparisonLoading ? (
                                <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={{ marginTop: 16, fontSize: 14, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                                        Loading comparison...
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {renderTrends()}
                                    {renderComparisonTable()}
                                    {renderCharts()}
                                </>
                            )}
                        </>
                    )}

                    {selectedYears.length === 0 && (
                        <View style={{
                            paddingVertical: 60,
                            alignItems: 'center',
                            backgroundColor: colors.surfaceContainerHighest,
                            borderRadius: 16
                        }}>
                            <MaterialIcons name="analytics" size={64} color={colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                            <Text style={{ marginTop: 16, fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                Select Years to Compare
                            </Text>
                            <Text style={{ marginTop: 8, fontSize: 14, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 }}>
                                Choose at least 2 academic years to view comparative analytics
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// Helper Component
function TrendCard({ label, value, icon, color, suffix = '' }) {
    const { colors } = useTheme();
    const isPositive = value > 0;
    const isNegative = value < 0;

    return (
        <View style={{
            flex: 1,
            minWidth: '30%',
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: 12,
            padding: 14,
            borderLeftWidth: 4,
            borderLeftColor: color
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MaterialIcons name={icon} size={20} color={color} />
                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                    {label}
                </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons
                    name={isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'trending-flat'}
                    size={20}
                    color={isPositive ? colors.success : isNegative ? colors.error : colors.onSurfaceVariant}
                />
                <Text style={{
                    fontSize: 20,
                    fontFamily: 'DMSans-Bold',
                    color: isPositive ? colors.success : isNegative ? colors.error : colors.onSurfaceVariant
                }}>
                    {isPositive ? '+' : ''}{value}{suffix}
                </Text>
            </View>
        </View>
    );
}
