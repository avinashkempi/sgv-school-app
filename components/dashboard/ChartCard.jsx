import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../theme';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const ChartCard = ({ title, chartType, data, labels, height = 220, secondary = false }) => {
    const { colors, styles } = useTheme();
    const screenWidth = Dimensions.get("window").width;

    const chartConfig = {
        backgroundGradientFrom: colors.surfaceContainer,
        backgroundGradientTo: colors.surfaceContainer,
        decimalPlaces: 0,
        color: (opacity = 1) => secondary ? colors.tertiary : colors.primary,
        labelColor: (opacity = 1) => colors.onSurfaceVariant,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: secondary ? colors.tertiary : colors.primary
        },
        propsForLabels: {
            fontSize: 10,
        }
    };

    const renderChart = () => {
        switch (chartType) {
            case 'line':
                return (
                    <LineChart
                        data={{
                            labels: labels || [],
                            datasets: [{ data: data || [] }]
                        }}
                        width={screenWidth - 70} // adjusted for padding
                        height={height}
                        chartConfig={chartConfig}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        withInnerLines={false}
                        withOuterLines={false}
                    />
                );
            case 'bar':
                return (
                    <BarChart
                        data={{
                            labels: labels || [],
                            datasets: [{ data: data || [] }]
                        }}
                        width={screenWidth - 80}
                        height={height}
                        yAxisLabel=""
                        chartConfig={chartConfig}
                        style={{ marginVertical: 8, borderRadius: 16 }}
                        showValuesOnTopOfBars
                        withInnerLines={false}
                    />
                );
            case 'pie':
                const pieData = data.map((item, index) => ({
                    name: item.name,
                    population: item.value,
                    color: index === 0 ? colors.primary : (index === 1 ? colors.secondary : colors.tertiary),
                    legendFontColor: colors.onSurfaceVariant,
                    legendFontSize: 12
                }));
                return (
                    <PieChart
                        data={pieData}
                        width={screenWidth - 60}
                        height={height}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        absolute
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderRadius: 24, padding: 20 }]}>
            <Text style={[styles.titleMedium, { marginBottom: 16 }]}>{title}</Text>
            <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                {renderChart()}
            </View>
        </View>
    );
};

export default ChartCard;
