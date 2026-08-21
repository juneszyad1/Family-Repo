import { playChime, triggerHaptic } from "../utils.js";

export class RestTimer {
  constructor(defaultSeconds = 90, onTick = null) {
    this.totalSeconds = defaultSeconds;
    this.remainingSeconds = defaultSeconds;
    this.status = "ready";
    this.endsAt = null;
    this.interval = null;
    this.onTick = onTick;
  }

  emit() {
    this.onTick?.({
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      status: this.status,
      endsAt: this.endsAt
    });
  }

  start(seconds = null) {
    if (seconds !== null) {
      this.totalSeconds = seconds;
      this.remainingSeconds = seconds;
    }
    if (this.remainingSeconds <= 0) {
      this.remainingSeconds = this.totalSeconds || 90;
    }
    this.endsAt = Date.now() + this.remainingSeconds * 1000;
    this.status = "running";
    this.tick();
    globalThis.clearInterval(this.interval);
    this.interval = globalThis.setInterval(() => this.tick(), 250);
  }

  tick() {
    this.remainingSeconds = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    if (this.remainingSeconds === 0) {
      this.pause();
      this.status = "finished";
      triggerHaptic("timer-finished");
      playChime();
    }
    this.emit();
  }

  pause() {
    if (this.status === "running") {
      this.remainingSeconds = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    }
    globalThis.clearInterval(this.interval);
    this.interval = null;
    this.endsAt = null;
    if (this.remainingSeconds > 0) {
      this.status = "paused";
    }
    this.emit();
  }

  addTime(seconds = 30) {
    this.remainingSeconds = Math.max(5, this.remainingSeconds + seconds);
    this.totalSeconds = Math.max(this.totalSeconds, this.remainingSeconds);
    if (this.status === "running") {
      this.endsAt = Date.now() + this.remainingSeconds * 1000;
    }
    this.emit();
  }

  reset(seconds = null) {
    globalThis.clearInterval(this.interval);
    this.interval = null;
    this.endsAt = null;
    if (seconds !== null) {
      this.totalSeconds = seconds;
    }
    this.remainingSeconds = this.totalSeconds;
    this.status = "ready";
    this.emit();
  }

  stop() {
    globalThis.clearInterval(this.interval);
    this.interval = null;
    this.endsAt = null;
    this.remainingSeconds = 0;
    this.status = "ready";
    this.emit();
  }

  destroy() {
    globalThis.clearInterval(this.interval);
    this.interval = null;
  }
}
