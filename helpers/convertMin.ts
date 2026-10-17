export function convertMinutesToHoursAndMinutes(minutes: number): string {
  if (minutes < 0) {
    throw new Error('Minutes cannot be negative');
  }

  if (minutes < 60) {
    return `${minutes}min${minutes > 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hoursText = `${hours}hr${hours > 1 ? 's' : ''}`;

  // "1hr" rather than "1hr 0min"
  return remainingMinutes === 0
    ? hoursText
    : `${hoursText} ${remainingMinutes}min${remainingMinutes > 1 ? 's' : ''}`;
}
