export const WEEKDAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getNextWeeklySlotDate = (dayOfWeek: string, startTime: string) => {
  const dayIndex = Number(dayOfWeek);
  const [hours, minutes] = startTime.split(':').map(Number);
  const now = new Date();

  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const currentDay = vnNow.getDay();
  const currentHour = vnNow.getHours();
  const currentMinute = vnNow.getMinutes();

  const targetDay = dayIndex % 7;
  const currentDayIndex = currentDay;
  const diff = (targetDay - currentDayIndex + 7) % 7;

  const next = new Date(vnNow);
  next.setDate(vnNow.getDate() + (diff === 0 ? 7 : diff));
  next.setHours(hours, minutes, 0, 0);

  if (diff === 0 && (currentHour > hours || (currentHour === hours && currentMinute >= minutes))) {
    next.setDate(next.getDate() + 7);
  }

  return next.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(' ', 'T');
};
