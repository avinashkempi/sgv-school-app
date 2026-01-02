import React from 'react';
import { View, Text, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../theme';

/**
 * PerformanceChart Component
 * Reusable chart component for displaying exam performance data
 * 
 * @param {String} type - Chart type: 'line', 'bar', 'pie'
 * @param {Object} data - Chart data
 * @param {String} title - Chart title
 * @param {Number} height - Chart height (default: 220)
 */
export default function PerformanceChart({
    type = 'line',
    data,
    title,
    height = 220,
    showLegend = true
}) {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width - 32;

    const chartConfig = {
        backgroundColor: colors.surface,
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        labelColor: (opacity = 1) => colors.onSurface,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: colors.primary
        },
        propsForBackgroundLines: {
            strokeDasharray: '', // solid lines
            stroke: colors.outlineVariant,
            strokeWidth: 1
        }
    };

    const renderLineChart = () => {
        if (!data || !data.labels || !data.datasets) {
            return renderEmptyState();
        }

        return (
            <LineChart
                data={data}
                width={screenWidth}
                height={height}
                chartConfig={chartConfig}
                bezier
                style={{
                    marginVertical: 8,
                    borderRadius: 16
                }}
                withInnerLines
                withOuterLines
                withVerticalLabels
                withHorizontalLabels
                withDots
                withShadow={false}
                fromZero
            />
        );
    };

    const renderBarChart = () => {
        if (!data || !data.labels || !data.datasets) {
            return renderEmptyState();
        }

        return (
            <BarChart
                data={data}
                width={screenWidth}
                height={height}
                chartConfig={{
                    ...chartConfig,
                    barPercentage: 0.7
                }}
                style={{
                    marginVertical: 8,
                    borderRadius: 16
                }}
                showValuesOnTopOfBars
                withInnerLines
                fromZero
            />
        );
    };

    const renderPieChart = () => {
        if (!data || !Array.isArray(data)) {
            return renderEmptyState();
        }

        const pieData = data.map((item, index) => ({
            name: item.name || item.label,
            population: item.value || item.count,
            color: item.color || getPieColor(index),
            legendFontColor: colors.onSurface,
            legendFontSize: 13,
            legendFontFamily: 'DMSans-Medium'
        }));

        return (
            <View>
                <PieChart
                    data={pieData}
                    width={screenWidth}
                    height={height}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    style={{
                        marginVertical: 8,
                        borderRadius: 16
                    }}
                    absolute={false} // Show percentages instead of absolute values
                />
                {showLegend && (
                    <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {pieData.map((item, index) => (
                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 6,
                                    backgroundColor: item.color
                                }} />
                                <Text style={{
                                    fontSize: 12,
                                    fontFamily: 'DMSans-Medium',
                                    color: colors.onSurface
                                }}>
                                    {item.name}: {item.population}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={{
            height,
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 8
        }}>
            <Text style={{
                fontSize: 14,
                fontFamily: 'DMSans-Medium',
                color: colors.onSurfaceVariant,
                opacity: 0.7
            }}>
                No data available
            </Text>
        </View>
    );

    const getPieColor = (index) => {
        const colors = [
            '#4CAF50', // A+/A - Green
            '#66BB6A',
            '#2196F3', // B+/B - Blue
            '#42A5F5',
            '#FF9800', // C - Orange
            '#FF5722', // D - Deep Orange
            '#F44336'  // F - Red
        ];
        return colors[index % colors.length];
    };

    return (
        <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.outlineVariant
        }}>
            {title && (
                <Text style={{
                    fontSize: 16,
                    fontFamily: 'DMSans-Bold',
                    color: colors.onSurface,
                    marginBottom: 12
                }}>
                    {title}
                </Text>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {type === 'line' && renderLineChart()}
                {type === 'bar' && renderBarChart()}
                {type === 'pie' && renderPieChart()}
            </ScrollView>
        </View>
    );
}
