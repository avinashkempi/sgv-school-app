/**
 * Formats a date string or object into "dd-mm-yyyy" format.
 * @param {string | Date} dateInput - The date to format.
 * @returns {string} - The formatted date string (e.g., "25-11-2025").
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return "";
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput); // Return original if invalid date

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    } catch (e) {
        return String(dateInput);
    }
};
