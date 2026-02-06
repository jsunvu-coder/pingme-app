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
