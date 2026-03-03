/**
 * Format a class name with "Grade - " prefix.
 * Examples:
 *   formatClassName("6")         -> "Grade - 6"
 *   formatClassName("6", "A")    -> "Grade - 6 A"
 *   formatClassName("6 A")       -> "Grade - 6 A"
 *   formatClassName(null)        -> ""
 *   formatClassName({ name: "6", section: "A" })  -> "Grade - 6 A"
 */
export const formatClassName = (nameOrObj, section) => {
    if (!nameOrObj) return '';

    // If an object with .name is passed
    if (typeof nameOrObj === 'object' && nameOrObj.name) {
        const sec = nameOrObj.section || section || '';
        return `Grade - ${nameOrObj.name}${sec ? ` ${sec}` : ''}`.trim();
    }

    // If string
    const name = String(nameOrObj).trim();
    if (!name) return '';

    // If already prefixed, don't double-prefix
    if (name.toLowerCase().startsWith('grade')) return name;

    const sec = section ? ` ${String(section).trim()}` : '';
    return `Grade - ${name}${sec}`.trim();
};

export default formatClassName;
