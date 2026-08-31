import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Share,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme, FONTS, FONT_SIZES } from "../../theme";
import Button from "../Button";
import { useToast } from "../ToastProvider";

import { formatUserName } from "../../utils/userFormatters";

export default function ReportCardExportModal({
  visible,
  onClose,
  reportData,
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const student = reportData?.student;
  const overall = reportData?.overall;
  const exams = reportData?.exams || [];
  const attendance = reportData?.attendance;

  // Extract distinct list of all subjects across all exams
  const allSubjects = Array.from(
    new Set(
      exams.flatMap((e) => e.subjects?.map((s) => s.subject) || []).filter(Boolean)
    )
  );

  // Generate clean, high-resolution printable HTML
  const generateHTML = () => {
    const studentName = formatUserName(student?.name) || "Student";
    const className = student?.class || student?.className || "N/A";
    const rollNo = student?.rollNumber || "N/A";
    const admNo = student?.admissionNumber || "N/A";
    const academicYear = student?.academicYear ? `Academic Year ${student.academicYear}` : "Academic Performance";
    const overallPct = overall?.percentage || 0;
    const overallGrade = overall?.grade || "-";
    const rank = overall?.classRank ? `Rank ${overall.classRank} / ${overall.totalInClass || "-"}` : "N/A";
    const attPct = attendance?.percentage !== null && attendance?.percentage !== undefined ? `${attendance.percentage}% (${attendance.presentDays}/${attendance.totalDays} Days)` : "N/A";

    const examHeaders = exams.map((e) => `<th style="padding: 8px 6px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 11px; text-align: center;">${e.examType}<br/><span style="font-size: 9px; font-weight: normal; color: #64748b;">(${e.weightage || 10}%)</span></th>`).join("");

    const subjectRows = allSubjects.map((subName) => {
      const examMarksCells = exams.map((exam) => {
        const sub = exam.subjects?.find((s) => s.subject === subName);
        if (!sub || sub.obtainedMarks === null || sub.obtainedMarks === undefined) {
          return `<td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8; font-size: 11px;">-</td>`;
        }
        return `<td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;"><b>${sub.obtainedMarks}</b><span style="font-size: 9px; color: #64748b;">/${sub.maxMarks}</span></td>`;
      }).join("");

      return `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; color: #1e293b;">${subName}</td>
          ${examMarksCells}
        </tr>
      `;
    }).join("");

    const examTotalRow = exams.map((exam) => {
      if (!exam.isCompleted) {
        return `<td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8; font-size: 11px; font-weight: bold;">Pending</td>`;
      }
      return `<td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; font-weight: bold; background: #f1f5f9;">${exam.percentage}%<br/><span style="font-size: 9px; color: #0284c7;">(${exam.grade})</span></td>`;
    }).join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Report Card - ${studentName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
          .report-container { max-width: 800px; margin: 0 auto; border: 2px solid #334155; padding: 24px; border-radius: 8px; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 18px; }
          .school-name { font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px; text-transform: uppercase; margin: 0; }
          .school-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
          .report-title { display: inline-block; background: #0284c7; color: white; padding: 4px 18px; font-size: 13px; font-weight: bold; border-radius: 20px; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 18px; font-size: 12px; background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
          .kpi-card { border: 1px solid #cbd5e1; padding: 10px; text-align: center; border-radius: 6px; background: #f8fafc; }
          .kpi-title { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .kpi-val { font-size: 16px; font-weight: 800; color: #0284c7; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; text-align: center; font-size: 12px; font-weight: bold; }
          .sig-line { border-top: 1px solid #64748b; margin-bottom: 4px; padding-top: 4px; }
          .footer-note { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
          @media print {
            body { padding: 0; background: none; }
            .report-container { border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1 class="school-name">Sri Guru Vidya English Medium School</h1>
            <div class="school-sub">Recognized by Govt. of Karnataka • Affiliated to State Board • SGV Academic Portal</div>
            <div class="report-title">Official Student Performance Report</div>
          </div>

          <div class="student-grid">
            <div><b>Student Name:</b> ${studentName}</div>
            <div><b>Academic Year:</b> ${academicYear}</div>
            <div><b>Class & Section:</b> ${className}</div>
            <div><b>Roll Number:</b> ${rollNo}</div>
            <div><b>Admission No:</b> ${admNo}</div>
            <div><b>Attendance:</b> ${attPct}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Overall Score</div>
              <div class="kpi-val">${overallPct}%</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Letter Grade</div>
              <div class="kpi-val">${overallGrade}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Class Standing</div>
              <div class="kpi-val" style="font-size: 13px;">${rank}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Attendance</div>
              <div class="kpi-val" style="font-size: 13px;">${attendance?.percentage || 0}%</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="padding: 8px 12px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 11px; text-align: left;">Subject</th>
                ${examHeaders}
              </tr>
            </thead>
            <tbody>
              ${subjectRows}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 12px; color: #0284c7;">Overall Term %</td>
                ${examTotalRow}
              </tr>
            </tbody>
          </table>

          <div style="font-size: 11px; color: #475569; margin-bottom: 24px; padding: 10px; background: #f8fafc; border-left: 3px solid #0284c7;">
            <b>CCE Grading Scale:</b> A+ (90-100% Outstanding), A (70-89% Excellent), B+ (50-69% Good), B (30-49% Average), C (Below 30% Needs Focus).
            Weightage: FA1 (10%), FA2 (10%), SA1 (30%), FA3 (10%), FA4 (10%), SA2 (30%).
          </div>

          <div class="signatures">
            <div>
              <div class="sig-line"></div>
              <div>Class Teacher</div>
            </div>
            <div>
              <div class="sig-line"></div>
              <div>Principal / HM</div>
            </div>
            <div>
              <div class="sig-line"></div>
              <div>Parent / Guardian</div>
            </div>
          </div>

          <div class="footer-note">
            This is an official system-generated report from SGV Mobile Portal • Issued on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleExportShare = async () => {
    try {
      setExporting(true);
      const html = generateHTML();

      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        } else {
          // Fallback download
          const element = document.createElement("a");
          const file = new Blob([html], { type: "text/html" });
          element.href = URL.createObjectURL(file);
          element.download = `ReportCard_${student?.name || "Student"}.html`;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        }
        showToast("Report card exported successfully", "success");
        setExporting(false);
        return;
      }

      // Native mobile file export via FileSystem & Sharing
      const fileName = `ReportCard_${(student?.name || "Student").replace(/\s+/g, "_")}.html`;
      const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/html",
          dialogTitle: `Official Report Card - ${student?.name || "Student"}`,
          UTI: "public.html",
        });
      } else {
        await Share.share({
          message: `Official Report Card for ${student?.name || "Student"} (${overall?.percentage || 0}%, Grade ${overall?.grade || "-"})`,
          title: "Report Card",
        });
      }

      showToast("Report card ready to share/print", "success");
    } catch (err) {
      console.error("Export Error:", err);
      showToast("Could not export report card", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: colors.primaryContainer },
                ]}
              >
                <MaterialIcons name="description" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                  Official Report Card
                </Text>
                <Text style={[styles.modalSub, { color: colors.onSurfaceVariant }]}>
                  Print-ready academic transcript
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Preview Scroll Content */}
          <ScrollView
            style={styles.previewScroll}
            contentContainerStyle={styles.previewContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.previewSheet,
                {
                  backgroundColor: isDark ? "#1E1E24" : "#FFFFFF",
                  borderColor: isDark ? "#33333E" : "#E2E8F0",
                },
              ]}
            >
              {/* School Banner */}
              <View style={styles.sheetHeader}>
                <Text style={[styles.schoolTitle, { color: isDark ? "#FFF" : "#0F172A" }]}>
                  Sri Guru Vidya
                </Text>
                <Text style={styles.schoolSubText}>
                  English Medium School
                </Text>
                <View style={styles.sheetPill}>
                  <Text style={styles.sheetPillText}>Official Report</Text>
                </View>
              </View>

              {/* Student Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Student Name</Text>
                  <Text style={[styles.detailVal, { color: colors.onSurface }]}>
                    {student?.name || "Student"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Class & Section</Text>
                  <Text style={[styles.detailVal, { color: colors.onSurface }]}>
                    {student?.class || "3rd Standard A"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Roll Number</Text>
                  <Text style={[styles.detailVal, { color: colors.onSurface }]}>
                    {student?.rollNumber || "12"}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailKey}>Overall Score</Text>
                  <Text style={[styles.detailVal, { color: colors.primary }]}>
                    {overall?.percentage || 0}% (Grade {overall?.grade || "-"})
                  </Text>
                </View>
              </View>

              {/* Mini Marks Preview Summary */}
              <View style={styles.previewStats}>
                <Text style={[styles.statHeader, { color: colors.onSurfaceVariant }]}>
                  {exams.filter((e) => e.isCompleted).length} of {exams.length} Assessments Completed
                </Text>
                <Text style={[styles.statHelper, { color: colors.onSurfaceVariant }]}>
                  Includes subject breakdowns for {allSubjects.length} subjects and CCE weight calculation.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.outlineVariant,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Button
              title="Close"
              variant="outlined"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title={exporting ? "Generating..." : "Share & Print"}
              variant="filled"
              icon={
                exporting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="share" size={18} color="#fff" />
                )
              }
              onPress={handleExportShare}
              disabled={exporting}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
  },
  modalSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  closeBtn: {
    padding: 6,
  },
  previewScroll: {
    maxHeight: 380,
  },
  previewContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  previewSheet: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  sheetHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
    paddingBottom: 12,
  },
  schoolTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bold,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  schoolSubText: {
    fontSize: FONT_SIZES.micro,
    color: "#64748B",
    marginTop: 2,
  },
  sheetPill: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 8,
  },
  sheetPillText: {
    color: "#FFF",
    fontSize: FONT_SIZES.micro,
    fontFamily: FONTS.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailItem: {
    width: "48%",
  },
  detailKey: {
    fontSize: FONT_SIZES.micro,
    color: "#64748B",
    fontFamily: FONTS.medium,
  },
  detailVal: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  previewStats: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  statHeader: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.bold,
  },
  statHelper: {
    fontSize: FONT_SIZES.micro,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
  },
});
