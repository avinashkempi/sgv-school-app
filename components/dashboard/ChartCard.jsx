import React, { useState } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useTheme } from '../../theme';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const ChartCard = ({
    title,
    subtitle,
    chartType,
    data,
    labels,
    height = 220,
    secondary = false,
    yAxisSuffix = '',
    showValues = true,
}) => {
    const { colors, styles, mode } = useTheme();
    const [containerWidth, setContainerWidth] = useState(0);
    const isDark = mode === 'dark';

    const screenWidth = Dimensions.get('window').width;
    const effectiveWidth = containerWidth > 0 ? containerWidth - 32 : screenWidth - 64;

    const chartColor = secondary ? (colors.tertiary || '#7D5260') : (colors.primary || '#6750A4');
    const surfaceColor = colors.surface || (isDark ? '#2B2832' : '#FFFFFF');

    const chartConfig = {
        backgroundColor: surfaceColor,
        backgroundGradientFrom: surfaceColor,
        backgroundGradientTo: surfaceColor,
        decimalPlaces: 0,
        color: (_opacity = 1) => chartColor,
        labelColor: (_opacity = 1) => colors.onSurfaceVariant || (isDark ? '#CAC4D0' : '#49454F'),
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: chartColor,
        },
        propsForLabels: {
            fontSize: 11,
            fontFamily: 'DMSans-Medium',
        },
        propsForBackgroundLines: {
            strokeDasharray: '4,4',
            stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
    };

    const renderChart = () => {
        const hasData = Array.isArray(data) && data.length > 0;
        if (!hasData) {
            return (
                <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, opacity: 0.7 }}>
                        No chart data available
                    </Text>
                </View>
            );
        }

        switch (chartType) {
            case 'line':
                return (
                    <LineChart
                        data={{
                            labels: labels || [],
                            datasets: [{ data: data || [] }],
                        }}
                        width={effectiveWidth}
                        height={height}
                        chartConfig={chartConfig}
                        yAxisSuffix={yAxisSuffix}
                        bezier={data && data.length > 1}
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        withInnerLines
                        withOuterLines={false}
                        fromZero
                    />
                );
            case 'bar':
                return (
                    <BarChart
                        data={{
                            labels: labels || [],
                            datasets: [{ data: data || [] }],
                        }}
                        width={effectiveWidth}
                        height={height}
                        yAxisLabel=""
                        yAxisSuffix={yAxisSuffix}
                        chartConfig={{
                            ...chartConfig,
                            barPercentage: 0.65,
                        }}
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        showValuesOnTopOfBars={showValues}
                        withInnerLines
                        fromZero
                    />
                );
            case 'pie': {
                const pieData = (data || []).map((item, index) => ({
                    name: item.name,
                    population: item.value,
                    color: index === 0 ? colors.primary : (index === 1 ? colors.secondary : colors.tertiary),
                    legendFontColor: colors.onSurfaceVariant,
                    legendFontSize: 12,
                    legendFontFamily: 'DMSans-Medium',
                }));
                return (
                    <PieChart
                        data={pieData}
                        width={effectiveWidth}
                        height={height}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                    />
                );
            }
            default:
                return null;
        }
    };

    return (
        <View
            onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - containerWidth) > 5) {
                    setContainerWidth(w);
                }
            }}
            style={{
                backgroundColor: colors.surfaceContainer || (isDark ? '#1E1B24' : '#F7F3FB'),
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.outlineVariant ? colors.outlineVariant + '35' : 'rgba(0,0,0,0.06)',
            }}
        >
            <View style={{ marginBottom: subtitle ? 12 : 16 }}>
                <Text
                    style={[
                        styles.titleMedium,
                        {
                            color: colors.onSurface || (isDark ? '#FFFFFF' : '#1D1B20'),
                            fontFamily: 'DMSans-Bold',
                        },
                    ]}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text
                        style={{
                            fontSize: 12,
                            fontFamily: 'DMSans-Medium',
                            color: colors.onSurfaceVariant || (isDark ? '#CAC4D0' : '#49454F'),
                            marginTop: 2,
                        }}
                    >
                        {subtitle}
                    </Text>
                )}
            </View>
            <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                {renderChart()}
            </View>
        </View>
    );
};

export default ChartCard;

