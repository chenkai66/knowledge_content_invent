// Task Context for tracking which task a prompt belongs to
export class TaskContext {
  private static currentTaskId: string | null = null;

  static setCurrentTask(taskId: string | null): void {
    this.currentTaskId = taskId;
  }

  static getCurrentTask(): string | null {
    return this.currentTaskId;
  }
}