export function convertMinutesToHoursAndMinutes(minutes: number): string {
  if (minutes < 0) {
    throw new Error('Minutes cannot be negative');
  }

  if (minutes < 60) {
    return `${minutes}min${minutes > 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}hr${hours > 1 ? 's' : ''} ${remainingMinutes}min${remainingMinutes > 1 ? 's' : ''}`;
}
