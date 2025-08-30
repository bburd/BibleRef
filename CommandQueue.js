"use strict";

class CommandQueue {
  constructor({ batchSize = 1 } = {}) {
    this.queue = [];
    this.queueRunning = false;
    this.commands = {};
    this.batchSize = batchSize;
    this.drainPromise = null;
    this.drainResolve = null;
  }

  publish(command, data) {
    const commandListeners = this.commands[command];
    if (commandListeners) {
      commandListeners.forEach((listener) =>
        this.queue.push({ listener, data })
      );
      if (!this.queueRunning) {
        this.queueRunning = true;
        setImmediate(() => this.runQueue());
      }
    }
  }

  async runQueue() {
    while (this.queue.length && this.queueRunning) {
      let count = 0;
      while (count < this.batchSize && this.queue.length) {
        const { listener, data } = this.queue.shift();
        try {
          await listener(data);
        } catch (error) {
          console.error("Error executing listener:", error);
          this.queue.unshift({ listener, data });
          setImmediate(() => this.runQueue());
          return;
        }
        count++;
      }
      if (this.queue.length) {
        setImmediate(() => this.runQueue());
        return;
      }
    }
    this.queueRunning = false;
    if (this.drainResolve) {
      this.drainResolve();
      this.drainResolve = null;
      this.drainPromise = null;
    }
  }

  drain() {
    if (!this.queue.length && !this.queueRunning) {
      return Promise.resolve();
    }
    if (!this.drainPromise) {
      this.drainPromise = new Promise((resolve) => {
        this.drainResolve = resolve;
      });
    }
    return this.drainPromise;
  }

  subscribe(command, listener) {
    if (!this.commands[command]) {
      this.commands[command] = [];
    }
    this.commands[command].push(listener);
  }
}

const queue = new CommandQueue();
module.exports = { queue, CommandQueue };
