/** Represents a value that can change over time but has no initial value.
 * If get() is called before set(), it will return a promise that resolves when set() is called.
 * After set() is called, get() will return the last value set immediately.
 */
export class PromiseBox<T> {
  private promise: Promise<T>
  private resolve!: (value: T) => void
  private value: T | null = null

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve
    })
  }

  set(value: T) {
    this.value = value
    this.resolve(value)
  }

  async get() {
    if (this.value !== null) {
      return this.value
    } else {
      return this.promise
    }
  }

  getImmediate() {
    return this.value
  }
}