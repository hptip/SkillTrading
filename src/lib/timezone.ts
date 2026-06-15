export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export const formatVietnamTime = (value: string | Date, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TIMEZONE,
    hour12: false,
    ...options,
  }).format(new Date(value));

export const formatVietnamDateTime = (value: string | Date) =>
  formatVietnamTime(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatVietnamDate = (value: string | Date) =>
  formatVietnamTime(value, { day: '2-digit', month: '2-digit', year: 'numeric' });
