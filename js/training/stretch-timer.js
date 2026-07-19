export class StretchTimer {
  constructor(seconds, onTick) { this.totalSeconds = seconds; this.remainingSeconds = seconds; this.onTick = onTick; this.status = "ready"; this.endsAt = null; this.interval = null; }
  emit() { this.onTick?.({ remainingSeconds: this.remainingSeconds, status: this.status, endsAt: this.endsAt }); }
  start() { if (this.status === "running") return; this.endsAt = Date.now() + this.remainingSeconds * 1000; this.status = "running"; this.tick(); this.interval = window.setInterval(() => this.tick(), 250); }
  tick() { this.remainingSeconds = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000)); if (!this.remainingSeconds) { this.pause(); this.status = "finished"; } this.emit(); }
  pause() { if (this.status === "running") this.remainingSeconds = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000)); window.clearInterval(this.interval); this.interval = null; this.endsAt = null; if (this.remainingSeconds) this.status = "paused"; this.emit(); }
  reset() { window.clearInterval(this.interval); this.interval = null; this.endsAt = null; this.remainingSeconds = this.totalSeconds; this.status = "ready"; this.emit(); }
  destroy() { window.clearInterval(this.interval); }
}
