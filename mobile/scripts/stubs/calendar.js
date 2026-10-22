export const getCalendarPermissionsAsync = async () => ({ granted: false, canAskAgain: true });
export const requestCalendarPermissionsAsync = async () => ({ granted: false, canAskAgain: false });
export const createEventInCalendarAsync = async () => ({ action: "canceled", id: null });
