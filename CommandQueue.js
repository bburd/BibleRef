"use strict";

class CommandQueue {
  constructor() {
    this.queue = [];
    this.queueRunning = false;
    this.commands = {};
  }

  publish(command, data) {
    const commandListeners = this.commands[command];
    if (commandListeners) {
      commandListeners.forEach((listener) =>
        this.queue.push({ listener, data })
      );
      if (!this.queueRunning) {
        this.runQueue();
      }
    }
  }

  async runQueue() {
    this.queueRunning = true;
    while (this.queue.length) {
      const { listener, data } = this.queue.shift();
      try {
        // Assuming listener can be an async function
        await listener(data);
        // Use setImmediate to prevent blocking the event loop
        setImmediate(() => this.runQueue());
      } catch (error) {
        console.error("Error executing listener:", error);
      }
      return; // Exit after setting the next cycle to prevent synchronous loop
    }
    this.queueRunning = false;
  }

  subscribe(command, listener) {
    if (!this.commands[command]) {
      this.commands[command] = [];
    }
    this.commands[command].push(listener);
  }
}

const queue = new CommandQueue();
module.exports = { queue };
