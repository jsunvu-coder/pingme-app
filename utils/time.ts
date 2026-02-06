export const getTimestamp = () => {
  return Date.now().valueOf() / 1000;
};

/** Formats a Unix timestamp (seconds) to "HH:mm". */
export const formatTime = (timestampSeconds: number): string => {
  const ms = timestampSeconds <= 9999999999 ? timestampSeconds * 1000 : timestampSeconds;
  const d = new Date(ms);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

/** Formats a Unix timestamp (seconds) to "hh:mm AM/PM". */
export const formatTime12h = (timestampSeconds: number): string => {
  const ms = timestampSeconds <= 9999999999 ? timestampSeconds * 1000 : timestampSeconds;
  const d = new Date(ms);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hoursStr = hours.toString().padStart(2, '0');
  return `${hoursStr}:${minutes} ${ampm}`;
};
