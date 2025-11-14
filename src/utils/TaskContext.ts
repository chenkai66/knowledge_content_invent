// Task Context for tracking which task and query a prompt belongs to
export class TaskContext {
  private static currentTaskId: string | null = null;
  private static currentQuery: string | null = null;
  private static currentQueryWithTimestamp: string | null = null;

  static setCurrentTask(taskId: string | null): void {
    this.currentTaskId = taskId;
  }

  static getCurrentTask(): string | null {
    return this.currentTaskId;
  }

  static setCurrentQuery(query: string | null): void {
    this.currentQuery = query;
  }

  static getCurrentQuery(): string | null {
    return this.currentQuery;
  }

  static setCurrentQueryWithTimestamp(queryWithTimestamp: string | null): void {
    this.currentQueryWithTimestamp = queryWithTimestamp;
  }

  static getCurrentQueryWithTimestamp(): string | null {
    return this.currentQueryWithTimestamp;
  }
}