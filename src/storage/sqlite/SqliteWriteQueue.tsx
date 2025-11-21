type Task = () => Promise<void>;

class SqliteWriteQueue {
  private queue: Task[] = [];
  private isProcessing = false;

  enqueue(task: Task): void {
    this.queue.push(task);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    const nextTask = this.queue.shift();
    if (nextTask) {
      try {
        await nextTask();
      } catch (e) {
        console.error('❌ SQLiteWriteQueue Task Error:', e);
      } finally {
        this.isProcessing = false;
        this.processQueue();
      }
    }
  }
}

const writeQueue = new SqliteWriteQueue();
export default writeQueue;