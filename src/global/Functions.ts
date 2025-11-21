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