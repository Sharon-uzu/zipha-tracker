export const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getStartDayOfMonth = (year, month) =>
    new Date(year, month, 1).getDay();

export const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();

export const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

