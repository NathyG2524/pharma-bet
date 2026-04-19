export const isLotExpired = (expiryDate: string, now = new Date()): boolean => {
  const todayKey = now.toISOString().slice(0, 10);
  return expiryDate < todayKey;
};
