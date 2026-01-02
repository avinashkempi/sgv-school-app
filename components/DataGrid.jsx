import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

/**
 * DataGrid Component
 * Spreadsheet-like grid for rapid data entry with keyboard navigation
 * Perfect for marks entry where teachers need to input data for many students
 * 
 * @param {Array} columns - Array of column definitions [{ key, label, width, editable, type }]
 * @param {Array} data - Array of row data objects
 * @param {Function} onCellChange - Callback when cell value changes (rowIndex, columnKey, value)
 * @param {Function} onSave - Callback to save all changes
 * @param {Boolean} autoSave - Whether to auto-save on blur
 * @param {Object} validation - Validation rules per column
 */
export default function DataGrid({
    columns = [],
    data = [],
    onCellChange,
    onSave,
    autoSave = false,
    validation = {},
    showLineNumbers = true,
    stickyHeader = true
}) {
    const { colors } = useTheme();
    const [editingCell, setEditingCell] = useState(null);
    const [localData, setLocalData] = useState(data);
    const [errors, setErrors] = useState({});
    const inputRefs = useRef({});

    useEffect(() => {
        setLocalData(data);
    }, [data]);

    const getCellKey = (rowIndex, columnKey) => `${rowIndex}-${columnKey}`;

    const validateCell = (columnKey, value) => {
        const rules = validation[columnKey];
        if (!rules) return null;

        if (rules.required && (value === '' || value === null || value === undefined)) {
            return 'Required';
        }

        if (rules.min !== undefined && parseFloat(value) < rules.min) {
            return `Min: ${rules.min}`;
        }

        if (rules.max !== undefined && parseFloat(value) > rules.max) {
            return `Max: ${rules.max}`;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
            return 'Invalid format';
        }

        if (rules.custom) {
            return rules.custom(value);
        }

        return null;
    };

    const handleCellEdit = (rowIndex, columnKey, value) => {
        const newData = [...localData];
        newData[rowIndex] = { ...newData[rowIndex], [columnKey]: value };
        setLocalData(newData);

        // Validate
        const error = validateCell(columnKey, value);
        const cellKey = getCellKey(rowIndex, columnKey);

        if (error) {
            setErrors({ ...errors, [cellKey]: error });
        } else {
            const newErrors = { ...errors };
            delete newErrors[cellKey];
            setErrors(newErrors);
        }

        // Callback
        if (onCellChange) {
            onCellChange(rowIndex, columnKey, value);
        }

        // Auto-save if enabled and no errors
        if (autoSave && !error && onSave) {
            onSave(newData);
        }
    };

    const handleCellFocus = (rowIndex, columnKey) => {
        setEditingCell(getCellKey(rowIndex, columnKey));
    };

    const handleCellBlur = () => {
        setEditingCell(null);
    };

    const moveFocus = (currentRow, currentCol, direction) => {
        let newRow = currentRow;
        let newCol = currentCol;

        switch (direction) {
            case 'right':
            case 'tab':
                newCol++;
                if (newCol >= columns.length) {
                    newCol = 0;
                    newRow++;
                }
                break;
            case 'left':
                newCol--;
                if (newCol < 0) {
                    newCol = columns.length - 1;
                    newRow--;
                }
                break;
            case 'down':
            case 'enter':
                newRow++;
                break;
            case 'up':
                newRow--;
                break;
        }

        // Bounds check
        if (newRow < 0 || newRow >= localData.length) return;
        if (newCol < 0 || newCol >= columns.length) return;

        // Skip non-editable columns
        while (newCol < columns.length && !columns[newCol].editable) {
            newCol++;
        }

        // Focus new cell
        const nextCellKey = getCellKey(newRow, columns[newCol].key);
        const nextInput = inputRefs.current[nextCellKey];
        if (nextInput) {
            nextInput.focus();
        }
    };

    const handleKeyPress = (e, rowIndex, colIndex) => {
        if (Platform.OS === 'web') {
            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    moveFocus(rowIndex, colIndex, e.shiftKey ? 'left' : 'tab');
                    break;
                case 'Enter':
                    e.preventDefault();
                    moveFocus(rowIndex, colIndex, 'enter');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    moveFocus(rowIndex, colIndex, 'down');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    moveFocus(rowIndex, colIndex, 'up');
                    break;
            }
        }
    };

    const getGradeColor = (grade) => {
        const gradeColors = {
            'A+': '#4CAF50',
            'A': '#66BB6A',
            'B+': '#29B6F6',
            'B': '#42A5F5',
            'C': '#FFA726',
            'D': '#FF7043',
            'F': '#EF5350'
        };
        return gradeColors[grade] || colors.onSurfaceVariant;
    };

    const renderCell = (row, column, rowIndex, colIndex) => {
        const cellKey = getCellKey(rowIndex, column.key);
        const value = row[column.key];
        const isEditing = editingCell === cellKey;
        const hasError = errors[cellKey];

        if (!column.editable) {
            // Read-only cell
            let displayValue = value;
            let cellColor = colors.onSurface;

            if (column.type === 'grade') {
                cellColor = getGradeColor(value);
            }

            return (
                <View
                    style={{
                        width: column.width || 100,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRightWidth: 1,
                        borderRightColor: colors.outlineVariant
                    }}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            fontFamily: column.type === 'grade' ? 'DMSans-Bold' : 'DMSans-Medium',
                            color: cellColor
                        }}
                        numberOfLines={1}
                    >
                        {displayValue || '-'}
                    </Text>
                </View>
            );
        }

        // Editable cell
        return (
            <View
                style={{
                    width: column.width || 100,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRightWidth: 1,
                    borderRightColor: colors.outlineVariant,
                    backgroundColor: isEditing ? colors.primaryContainer : 'transparent'
                }}
            >
                <TextInput
                    ref={(ref) => inputRefs.current[cellKey] = ref}
                    value={value?.toString() || ''}
                    onChangeText={(text) => handleCellEdit(rowIndex, column.key, text)}
                    onFocus={() => handleCellFocus(rowIndex, column.key)}
                    onBlur={handleCellBlur}
                    onKeyPress={(e) => handleKeyPress(e, rowIndex, colIndex)}
                    keyboardType={column.type === 'number' ? 'numeric' : 'default'}
                    style={{
                        fontSize: 14,
                        fontFamily: 'DMSans-Medium',
                        color: hasError ? colors.error : colors.onSurface,
                        padding: 6,
                        borderWidth: isEditing ? 2 : 1,
                        borderColor: hasError ? colors.error : (isEditing ? colors.primary : colors.outline),
                        borderRadius: 4,
                        backgroundColor: colors.surface,
                        outlineStyle: 'none' // Web only
                    }}
                    selectTextOnFocus
                />
                {hasError && (
                    <Text style={{
                        fontSize: 10,
                        fontFamily: 'DMSans-Medium',
                        color: colors.error,
                        marginTop: 2
                    }}>
                        {hasError}
                    </Text>
                )}
            </View>
        );
    };

    const renderHeader = () => (
        <View
            style={{
                flexDirection: 'row',
                backgroundColor: colors.surfaceContainerHigh,
                borderBottomWidth: 2,
                borderBottomColor: colors.primary,
                ...(stickyHeader && Platform.OS === 'web' ? { position: 'sticky', top: 0, zIndex: 10 } : {})
            }}
        >
            {showLineNumbers && (
                <View
                    style={{
                        width: 50,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRightWidth: 1,
                        borderRightColor: colors.outlineVariant,
                        alignItems: 'center'
                    }}
                >
                    <MaterialIcons name="numbers" size={16} color={colors.onSurfaceVariant} />
                </View>
            )}
            {columns.map((column, index) => (
                <View
                    key={column.key}
                    style={{
                        width: column.width || 100,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRightWidth: index === columns.length - 1 ? 0 : 1,
                        borderRightColor: colors.outlineVariant
                    }}
                >
                    <Text
                        style={{
                            fontSize: 13,
                            fontFamily: 'DMSans-Bold',
                            color: colors.onSurface
                        }}
                        numberOfLines={1}
                    >
                        {column.label}
                    </Text>
                </View>
            ))}
        </View>
    );

    const renderRow = (row, rowIndex) => {
        const isEvenRow = rowIndex % 2 === 0;

        return (
            <View
                key={rowIndex}
                style={{
                    flexDirection: 'row',
                    backgroundColor: isEvenRow ? colors.surface : colors.surfaceContainerLowest,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.outlineVariant
                }}
            >
                {showLineNumbers && (
                    <View
                        style={{
                            width: 50,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRightWidth: 1,
                            borderRightColor: colors.outlineVariant,
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13,
                                fontFamily: 'DMSans-Bold',
                                color: colors.onSurfaceVariant
                            }}
                        >
                            {rowIndex + 1}
                        </Text>
                    </View>
                )}
                {columns.map((column, colIndex) => (
                    <React.Fragment key={column.key}>
                        {renderCell(row, column, rowIndex, colIndex)}
                    </React.Fragment>
                ))}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                    {renderHeader()}
                    <ScrollView showsVerticalScrollIndicator={true}>
                        {localData.map((row, index) => renderRow(row, index))}
                    </ScrollView>
                </View>
            </ScrollView>

            {/* Quick Stats Footer */}
            <View
                style={{
                    flexDirection: 'row',
                    backgroundColor: colors.surfaceContainerHighest,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.outlineVariant,
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant }}>
                    {localData.length} rows
                </Text>
                {Object.keys(errors).length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="error" size={16} color={colors.error} />
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans-Bold', color: colors.error }}>
                            {Object.keys(errors).length} errors
                        </Text>
                    </View>
                )}
                {onSave && (
                    <Pressable
                        onPress={() => onSave(localData)}
                        disabled={Object.keys(errors).length > 0}
                        style={({ pressed }) => ({
                            backgroundColor: Object.keys(errors).length > 0
                                ? colors.surfaceContainerHigh
                                : (pressed ? colors.primary + 'DD' : colors.primary),
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            opacity: Object.keys(errors).length > 0 ? 0.5 : 1
                        })}
                    >
                        <MaterialIcons name="save" size={16} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'DMSans-Bold' }}>
                            Save All
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}
