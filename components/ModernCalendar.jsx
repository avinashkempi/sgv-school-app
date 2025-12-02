import React, { useMemo } from 'react';
import { View,} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

const ModernCalendar = ({
    current,
    onDayPress,
    markedDates,
    onMonthChange,
    dayComponent,
    style,
    markingType,
    theme: customTheme,
}) => {
    const { colors, styles } = useTheme();

    const defaultTheme = useMemo(() => ({
        backgroundColor: colors.cardBackground,
        calendarBackground: colors.cardBackground,
        textSectionTitleColor: colors.textSecondary,
        selectedDayBackgroundColor: colors.primary,
        selectedDayTextColor: colors.white,
        todayTextColor: colors.primary,
        dayTextColor: colors.textPrimary,
        textDisabledColor: colors.textSecondary + '50',
        dotColor: colors.primary,
        selectedDotColor: colors.white,
        arrowColor: colors.primary,
        monthTextColor: colors.textPrimary,
        indicatorColor: colors.primary,
        textDayFontFamily: 'DMSans-Medium',
        textMonthFontFamily: 'DMSans-Bold',
        textDayHeaderFontFamily: 'DMSans-Bold',
        textDayFontSize: 14,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 12,
        'stylesheet.calendar.header': {
            header: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingLeft: 10,
                paddingRight: 10,
                marginTop: 6,
                marginBottom: 6,
                alignItems: 'center',
            },
            monthText: {
                fontSize: 18,
                fontFamily: 'DMSans-Bold',
                color: colors.textPrimary,
                margin: 10,
            },
            arrow: {
                padding: 10,
            },
        },
        'stylesheet.day.basic': {
            base: {
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
            },
        },
    }), [colors]);

    return (
        <View style={[styles.cardMinimal, { padding: 0, overflow: 'hidden' }, style]}>
            <Calendar
                current={current}
                onDayPress={onDayPress}
                markedDates={markedDates}
                onMonthChange={onMonthChange}
                dayComponent={dayComponent}
                markingType={markingType}
                theme={{ ...defaultTheme, ...customTheme }}
                enableSwipeMonths={true}
                hideExtraDays={false}
                renderArrow={(direction) => (
                    <View style={{
                        backgroundColor: colors.background,
                        borderRadius: 8,
                        padding: 4,
                    }}>
                        <MaterialIcons
                            name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
                            size={20}
                            color={colors.textPrimary}
                        />
                    </View>
                )}
            />
        </View>
    );
};

export default ModernCalendar;
