export class QueueNode<T> {
  constructor(
    public value: T,
    public next: QueueNode<T> | null = null
  ) {}
}

export class Queue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private count: number = 0;

  enqueue(item: T): void {
    const newNode = new QueueNode(item);
    
    if (this.tail) {
      this.tail.next = newNode;
    } else {
      this.head = newNode;
    }
    
    this.tail = newNode;
    this.count++;
  }

  dequeue(): T | undefined {
    if (!this.head) return undefined;
    
    const value = this.head.value;
    this.head = this.head.next;
    
    if (!this.head) {
      this.tail = null;
    }
    
    this.count--;
    return value;
  }

  peek(): T | undefined {
    return this.head?.value;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this.count = 0;
  }
}
