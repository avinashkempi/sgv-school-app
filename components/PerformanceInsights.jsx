import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Card from './Card';

/**
 * PerformanceInsights Component
 * Shows strengths, weaknesses, and personalized recommendations
 * 
 * @param {Object} reportData - Complete report card data
 */
export default function PerformanceInsights({ reportData }) {
    const { colors } = useTheme();

    if (!reportData || !reportData.exams) return null;

    // Calculate insights
    const calculateInsights = () => {
        const subjectPerformance = {};

        // Aggregate performance across all exams
        reportData.exams.forEach(exam => {
            if (exam.isCompleted && exam.subjects) {
                exam.subjects.forEach(sub => {
                    if (!subjectPerformance[sub.subject]) {
                        subjectPerformance[sub.subject] = {
                            total: 0,
                            obtained: 0,
                            count: 0,
                            grades: []
                        };
                    }
                    subjectPerformance[sub.subject].total += sub.maxMarks;
                    subjectPerformance[sub.subject].obtained += sub.obtainedMarks;
                    subjectPerformance[sub.subject].count++;
                    subjectPerformance[sub.subject].grades.push(sub.grade);
                });
            }
        });

        // Calculate average percentage for each subject
        const subjects = Object.keys(subjectPerformance).map(subject => {
            const perf = subjectPerformance[subject];
            const percentage = (perf.obtained / perf.total) * 100;
            return {
                subject,
                percentage: parseFloat(percentage.toFixed(1)),
                avgGrade: getMostCommonGrade(perf.grades),
                examCount: perf.count
            };
        });

        // Sort by percentage
        subjects.sort((a, b) => b.percentage - a.percentage);

        // Identify strengths (top 3) and weaknesses (bottom 3)
        const strengths = subjects.slice(0, Math.min(3, subjects.length));
        const weaknesses = subjects.slice(-Math.min(3, subjects.length)).reverse();

        // Calculate trends
        const trends = calculateTrends();

        return { strengths, weaknesses, trends };
    };

    const calculateTrends = () => {
        if (!reportData.exams || reportData.exams.length < 2) return null;

        const completedExams = reportData.exams.filter(e => e.isCompleted);
        if (completedExams.length < 2) return null;

        const latest = completedExams[completedExams.length - 1];
        const previous = completedExams[completedExams.length - 2];

        const change = latest.percentage - previous.percentage;

        return {
            direction: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
            change: Math.abs(change).toFixed(1),
            latest: latest.examType,
            previous: previous.examType
        };
    };

    const getMostCommonGrade = (grades) => {
        const counts = {};
        grades.forEach(g => counts[g] = (counts[g] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    };

    const getGradeColor = (percentage) => {
        if (percentage >= 90) return '#4CAF50';
        if (percentage >= 80) return '#66BB6A';
        if (percentage >= 70) return '#2196F3';
        if (percentage >= 60) return '#42A5F5';
        if (percentage >= 50) return '#FF9800';
        if (percentage >= 40) return '#FF5722';
        return '#F44336';
    };

    const insights = calculateInsights();

    return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Overall Trend */}
            {insights.trends && (
                <Card variant="filled" style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: insights.trends.direction === 'improving'
                                ? colors.success + '20'
                                : insights.trends.direction === 'declining'
                                    ? colors.error + '20'
                                    : colors.primary + '20',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MaterialIcons
                                name={insights.trends.direction === 'improving' ? 'trending-up' :
                                    insights.trends.direction === 'declining' ? 'trending-down' : 'trending-flat'}
                                size={24}
                                color={insights.trends.direction === 'improving'
                                    ? colors.success
                                    : insights.trends.direction === 'declining'
                                        ? colors.error
                                        : colors.primary}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                Performance Trend
                            </Text>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 2 }}>
                                {insights.trends.direction === 'improving'
                                    ? `You're improving! Up ${insights.trends.change}% from ${insights.trends.previous}`
                                    : insights.trends.direction === 'declining'
                                        ? `Down ${insights.trends.change}% from ${insights.trends.previous}. Don't worry, you can bounce back!`
                                        : 'Your performance is consistent'}
                            </Text>
                        </View>
                    </View>
                </Card>
            )}

            {/* Strengths */}
            <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                Your Strengths 💪
            </Text>
            {insights.strengths.map((item, index) => (
                <Card key={item.subject} variant="outlined" style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.success + '20',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.success }}>
                                {index + 1}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                {item.subject}
                            </Text>
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 2 }}>
                                {item.examCount} exams · Average: {item.avgGrade}
                            </Text>
                        </View>
                        <View style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: getGradeColor(item.percentage) + '20'
                        }}>
                            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: getGradeColor(item.percentage) }}>
                                {item.percentage}%
                            </Text>
                        </View>
                    </View>
                </Card>
            ))}

            {/* Weaknesses */}
            <Text style={{ fontSize: 18, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginTop: 20, marginBottom: 12 }}>
                Areas to Improve 📚
            </Text>
            {insights.weaknesses.map((item, index) => (
                <Card key={item.subject} variant="outlined" style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.error + '15',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MaterialIcons name="trending-down" size={20} color={colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                {item.subject}
                            </Text>
                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 2 }}>
                                {item.examCount} exams · Average: {item.avgGrade}
                            </Text>
                        </View>
                        <View style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: getGradeColor(item.percentage) + '20'
                        }}>
                            <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: getGradeColor(item.percentage) }}>
                                {item.percentage}%
                            </Text>
                        </View>
                    </View>

                    {/* Recommendation */}
                    <View style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: colors.outlineVariant
                    }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.primary, marginBottom: 4 }}>
                            💡 Recommendation
                        </Text>
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, lineHeight: 18 }}>
                            {getRecommendation(item.percentage)}
                        </Text>
                    </View>
                </Card>
            ))}

            {/* Study Tips */}
            <Card variant="filled" style={{ marginTop: 20, marginBottom: 16, backgroundColor: colors.primaryContainer }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <MaterialIcons name="lightbulb" size={24} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                            Study Tips
                        </Text>
                        <View style={{ gap: 6 }}>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, lineHeight: 18 }}>
                                • Focus extra time on {insights.weaknesses[0]?.subject}
                            </Text>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, lineHeight: 18 }}>
                                • Review previous exam papers
                            </Text>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, lineHeight: 18 }}>
                                • Ask your teacher for help in weak areas
                            </Text>
                            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, lineHeight: 18 }}>
                                • Create a study schedule and stick to it
                            </Text>
                        </View>
                    </View>
                </View>
            </Card>
        </ScrollView>
    );
}

function getRecommendation(percentage) {
    if (percentage >= 70) {
        return "You're doing well! Keep practicing to maintain this performance.";
    } else if (percentage >= 50) {
        return "Focus on understanding core concepts. Practice more problems and review class notes regularly.";
    } else {
        return "Seek help from your teacher. Consider extra tutoring and dedicate more study time to this subject.";
    }
}
