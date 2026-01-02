import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    Modal,
    ScrollView,
    ActivityIndicator,
    Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme';
import { useApiMutation, createApiMutationFn } from '../hooks/useApi';
import { useToast } from './ToastProvider';
import apiConfig from '../config/apiConfig';

/**
 * CSVImportModal Component
 * Modal for importing marks from CSV file
 * 
 * @param {Boolean} visible - Modal visibility
 * @param {Function} onClose - Close handler
 * @param {String} examId - Exam ID for import
 * @param {Function} onSuccess - Success callback after import
 */
export default function CSVImportModal({ visible, onClose, examId, onSuccess }) {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const [selectedFile, setSelectedFile] = useState(null);
    const [csvData, setCsvData] = useState([]);
    const [importResults, setImportResults] = useState(null);

    // Import mutation
    const importMutation = useApiMutation({
        mutationFn: createApiMutationFn(`${apiConfig.baseUrl}/marks/import/csv`, 'POST'),
        onSuccess: (result) => {
            setImportResults(result.results);
            showToast(result.message, result.results.failed > 0 ? 'warning' : 'success');
            if (onSuccess) onSuccess();
        },
        onError: (error) => showToast(error.message || 'Import failed', 'error')
    });

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
                copyToCacheDirectory: true
            });

            if (result.type === 'success' || result.assets?.[0]) {
                const file = result.assets?.[0] || result;
                setSelectedFile(file);

                // Parse CSV
                if (Platform.OS === 'web') {
                    const text = await file.file.text();
                    parseCSV(text);
                } else {
                    // For native, we'd need to read the file
                    // For now, just store the file reference
                    showToast('File selected. Click Import to proceed.', 'info');
                }
            }
        } catch (error) {
            showToast('Error picking file: ' + error.message, 'error');
        }
    };

    const parseCSV = (text) => {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = lines[i].split(',');
            const row = {};

            headers.forEach((header, index) => {
                if (header.includes('name')) row.name = values[index]?.trim();
                else if (header.includes('email')) row.email = values[index]?.trim();
                else if (header.includes('id')) row.studentId = values[index]?.trim();
                else if (header.includes('mark')) row.marksObtained = values[index]?.trim();
                else if (header.includes('remark')) row.remarks = values[index]?.trim();
            });

            if (row.marksObtained) {
                data.push(row);
            }
        }

        setCsvData(data);
        showToast(`Parsed ${data.length} rows from CSV`, 'success');
    };

    const handleImport = () => {
        if (!csvData || csvData.length === 0) {
            showToast('No data to import. Please select a valid CSV file.', 'warning');
            return;
        }

        importMutation.mutate({
            examId,
            csvData
        });
    };

    const handleDownloadTemplate = async () => {
        // Download template from backend
        const url = `${apiConfig.baseUrl}/marks/import/template/${examId}`;

        if (Platform.OS === 'web') {
            // For web, open in new tab to trigger download
            window.open(url, '_blank');
        } else {
            // For mobile, would need to handle file download
            showToast('Template download available on web', 'info');
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setCsvData([]);
        setImportResults(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'flex-end'
            }}>
                <View style={{
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    paddingTop: 20,
                    paddingHorizontal: 20,
                    paddingBottom: 40,
                    maxHeight: '80%'
                }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                            Import Marks from CSV
                        </Text>
                        <Pressable onPress={handleClose}>
                            <MaterialIcons name="close" size={24} color={colors.onSurface} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Instructions */}
                        {!importResults && (
                            <View style={{
                                backgroundColor: colors.primaryContainer,
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 20
                            }}>
                                <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 8 }}>
                                    Instructions:
                                </Text>
                                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, lineHeight: 20 }}>
                                    1. Download the CSV template{'\n'}
                                    2. Fill in marks for each student{'\n'}
                                    3. Upload the completed CSV{'\n'}
                                    4. Review and confirm import
                                </Text>
                            </View>
                        )}

                        {/* Download Template Button */}
                        {!importResults && (
                            <Pressable
                                onPress={handleDownloadTemplate}
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? colors.secondaryContainer : colors.surfaceContainerHigh,
                                    borderRadius: 12,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 16
                                })}
                            >
                                <View style={{
                                    backgroundColor: colors.secondary + '20',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MaterialIcons name="download" size={24} color={colors.secondary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                        Download Template
                                    </Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 2 }}>
                                        Get CSV template with all students
                                    </Text>
                                </View>
                            </Pressable>
                        )}

                        {/* File Picker */}
                        {!importResults && (
                            <Pressable
                                onPress={handlePickFile}
                                style={({ pressed }) => ({
                                    backgroundColor: pressed ? colors.primaryContainer : colors.surfaceContainerHigh,
                                    borderRadius: 12,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 16,
                                    borderWidth: 2,
                                    borderColor: selectedFile ? colors.primary : colors.outline,
                                    borderStyle: 'dashed'
                                })}
                            >
                                <View style={{
                                    backgroundColor: colors.primary + '20',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MaterialIcons name="upload-file" size={24} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: colors.onSurface }}>
                                        {selectedFile ? selectedFile.name : 'Select CSV File'}
                                    </Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onSurfaceVariant, marginTop: 2 }}>
                                        {csvData.length > 0 ? `${csvData.length} rows loaded` : 'Click to browse files'}
                                    </Text>
                                </View>
                            </Pressable>
                        )}

                        {/* Import Results */}
                        {importResults && (
                            <View>
                                <View style={{
                                    backgroundColor: colors.surfaceContainerHigh,
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 16
                                }}>
                                    <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: colors.onSurface, marginBottom: 12 }}>
                                        Import Results
                                    </Text>

                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                        <View style={{ flex: 1, backgroundColor: colors.success + '20', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.success }}>
                                                {importResults.imported}
                                            </Text>
                                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                                Created
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1, backgroundColor: colors.primary + '20', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.primary }}>
                                                {importResults.updated}
                                            </Text>
                                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                                Updated
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1, backgroundColor: colors.error + '20', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 20, fontFamily: 'DMSans-Bold', color: colors.error }}>
                                                {importResults.failed}
                                            </Text>
                                            <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: colors.onSurfaceVariant, marginTop: 4 }}>
                                                Failed
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Errors */}
                                {importResults.errors && importResults.errors.length > 0 && (
                                    <View style={{
                                        backgroundColor: colors.errorContainer,
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 16
                                    }}>
                                        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Bold', color: colors.error, marginBottom: 8 }}>
                                            Errors ({importResults.errors.length})
                                        </Text>
                                        {importResults.errors.slice(0, 5).map((err, index) => (
                                            <Text key={index} style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: colors.onErrorContainer, marginBottom: 4 }}>
                                                Row {err.row}: {err.error}
                                            </Text>
                                        ))}
                                        {importResults.errors.length > 5 && (
                                            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: colors.onErrorContainer, marginTop: 4 }}>
                                                ...and {importResults.errors.length - 5} more errors
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                            {!importResults && (
                                <>
                                    <Pressable
                                        onPress={handleClose}
                                        style={({ pressed }) => ({
                                            flex: 1,
                                            backgroundColor: pressed ? colors.surfaceContainerHigh : colors.surfaceContainerHighest,
                                            paddingVertical: 14,
                                            borderRadius: 12,
                                            alignItems: 'center'
                                        })}
                                    >
                                        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: colors.onSurface }}>
                                            Cancel
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleImport}
                                        disabled={csvData.length === 0 || importMutation.isPending}
                                        style={({ pressed }) => ({
                                            flex: 2,
                                            backgroundColor: csvData.length === 0 || importMutation.isPending
                                                ? colors.surfaceContainerHigh
                                                : (pressed ? colors.primary + 'DD' : colors.primary),
                                            paddingVertical: 14,
                                            borderRadius: 12,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            opacity: csvData.length === 0 ? 0.5 : 1
                                        })}
                                    >
                                        {importMutation.isPending ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <MaterialIcons name="cloud-upload" size={20} color="#FFFFFF" />
                                                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: '#FFFFFF' }}>
                                                    Import Marks
                                                </Text>
                                            </>
                                        )}
                                    </Pressable>
                                </>
                            )}

                            {importResults && (
                                <Pressable
                                    onPress={handleClose}
                                    style={({ pressed }) => ({
                                        flex: 1,
                                        backgroundColor: pressed ? colors.primary + 'DD' : colors.primary,
                                        paddingVertical: 14,
                                        borderRadius: 12,
                                        alignItems: 'center'
                                    })}
                                >
                                    <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: '#FFFFFF' }}>
                                        Done
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
