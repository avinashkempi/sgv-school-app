import React from "react";
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Modal
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

export default function UserDetailModal({ visible, onClose, user }) {
    const { colors } = useTheme();

    if (!user) return null;

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
            case 'super admin': return colors.error;
            case 'teacher': return colors.primary;
            case 'staff': return colors.success;
            case 'support_staff': return '#795548';
            default: return colors.primary;
        }
    };

    const getRoleDisplay = (user) => {
        if ((user.role === 'teacher' || user.role === 'staff' || user.role === 'support_staff') && user.designation) {
            return user.designation;
        }
        return user.role.replace('_', ' ');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View style={{
                    backgroundColor: colors.background,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    height: '90%',
                    paddingBottom: 40
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 24,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border
                    }}>
                        <Text style={{ fontSize: 20, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                            User Details
                        </Text>
                        <Pressable onPress={onClose}>
                            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 24 }}>
                        {/* Header Profile Section */}
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <View style={{
                                width: 80, height: 80, borderRadius: 40,
                                backgroundColor: colors.primary + '15',
                                justifyContent: 'center', alignItems: 'center',
                                marginBottom: 12
                            }}>
                                <MaterialIcons name="person" size={40} color={colors.primary} />
                            </View>
                            <Text style={{ fontSize: 24, fontFamily: "DMSans-Bold", color: colors.textPrimary }}>
                                {user.name}
                            </Text>
                            <View style={{
                                backgroundColor: getRoleColor(user.role) + "20",
                                paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, marginTop: 4
                            }}>
                                <Text style={{ fontSize: 12, fontFamily: "DMSans-Bold", color: getRoleColor(user.role) }}>
                                    {getRoleDisplay(user)}
                                </Text>
                            </View>
                        </View>

                        {/* Contact Information */}
                        <DetailSection title="CONTACT INFORMATION">
                            <DetailRow icon="phone" label="Primary Phone" value={user.phone} />
                            {user.phone2 && <DetailRow icon="phone-android" label="Secondary Phone" value={user.phone2} />}
                            {user.email && <DetailRow icon="email" label="Email Address" value={user.email} />}
                            {user.address && <DetailRow icon="location-on" label="Address" value={user.address} />}
                        </DetailSection>

                        {/* Role Specific Details - Student */}
                        {user.role === 'student' && (
                            <>
                                <DetailSection title="ACADEMIC & IDENTITY">
                                    <View style={{ flexDirection: 'row', gap: 16 }}>
                                        <DetailRow label="REG NO" value={user.regNo || "N/A"} style={{ flex: 1 }} />
                                        <DetailRow label="SATS NO" value={user.satsNumber || "N/A"} style={{ flex: 1 }} />
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 16 }}>
                                        <DetailRow label="PEN NO" value={user.penNumber || "N/A"} style={{ flex: 1 }} />
                                        <DetailRow label="APAAR ID" value={user.apaarId || "N/A"} style={{ flex: 1 }} />
                                    </View>
                                    <DetailRow label="Class" value={user.currentClass?.name || "N/A"} />
                                    <DetailRow label="Academic Year" value={user.academicYear?.name || "N/A"} />
                                </DetailSection>

                                <DetailSection title="PERSONAL DETAILS">
                                    <View style={{ flexDirection: 'row', gap: 16 }}>
                                        <DetailRow label="Gender" value={user.gender || "N/A"} style={{ flex: 1 }} />
                                        <DetailRow label="Blood Group" value={user.bloodGroup || "N/A"} style={{ flex: 1 }} />
                                    </View>
                                    <DetailRow label="Date of Birth" value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "N/A"} />
                                    <DetailRow label="Guardian Name" value={user.guardianName || "N/A"} />
                                    <DetailRow label="Guardian Phone" value={user.guardianPhone || "N/A"} />
                                    <DetailRow label="Status" value={user.isAdmitted ? "Active (Admitted)" : "Inactive"} />
                                </DetailSection>
                            </>
                        )}

                        {/* Role Specific Details - Teacher/Staff */}
                        {(user.role === 'teacher' || user.role === 'staff' || user.role === 'support_staff') && (
                            <DetailSection title="EMPLOYMENT DETAILS">
                                <DetailRow label="Designation" value={user.designation || "N/A"} />
                                <DetailRow label="Joining Date" value={user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : "N/A"} />
                            </DetailSection>
                        )}

                        {user.remarks && (
                            <DetailSection title="REMARKS">
                                <Text style={{ fontFamily: "DMSans-Regular", color: colors.textPrimary }}>{user.remarks}</Text>
                            </DetailSection>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const DetailSection = ({ title, children }) => {
    const { colors } = useTheme();
    return (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontFamily: "DMSans-Bold", color: colors.textSecondary, marginBottom: 12, letterSpacing: 1 }}>
                {title}
            </Text>
            <View style={{ backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
                {children}
            </View>
        </View>
    );
};

const DetailRow = ({ icon, label, value, style }) => {
    const { colors } = useTheme();
    return (
        <View style={[{ marginBottom: 4 }, style]}>
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "DMSans-Medium", marginBottom: 2 }}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {icon && <MaterialIcons name={icon} size={16} color={colors.primary} style={{ marginRight: 8 }} />}
                <Text style={{ fontSize: 15, fontFamily: "DMSans-Medium", color: colors.textPrimary }}>{value || "N/A"}</Text>
            </View>
        </View>
    );
};
