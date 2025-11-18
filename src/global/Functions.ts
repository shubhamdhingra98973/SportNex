

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
