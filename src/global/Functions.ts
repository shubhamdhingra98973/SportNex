import {ObjectId} from 'bson';


export const formatDateE = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
};

export const generateNewObjectIdE = () => {
  return new ObjectId().toHexString();
};

export const getCurrentTimeInSecondsE = () => {
  return Math.floor(new Date().getTime() / 1000);
};

export const getCurrentTimeMilliSecondsE = () => {
  return Math.floor(new Date().getTime());
};


export const normalizeTimestampToSecondsStringE = (timestamp: number | string): string => {
  const numericValue = Number(timestamp)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '0'
  }

  const needsConversion = numericValue > 1e11
  const seconds = needsConversion ? Math.floor(numericValue / 1000) : Math.floor(numericValue)
  return seconds.toString()
}