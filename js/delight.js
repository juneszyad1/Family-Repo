import { playChime, triggerHaptic, escapeHtml, formatNumber } from "./utils.js";
import { GOAL_TYPES, getDirectionFactor } from "./goals.js";

/**
 * High-performance canvas-based particle confetti burst
 * Non-blocking, automatic cleanup after 2.5s.
 */
export function triggerConfetti(options = {}) {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.className = "delight-confetti-canvas";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = (canvas.width = window.innerWidth * dpr);
  const height = (canvas.height = window.innerHeight * dpr);

  const colors = options.colors || [
    "#f59e0b", // Electric Amber
    "#38bdf8", // Sky Blue
    "#10b981", // Emerald Green
    "#fbbf24", // Gold
    "#818cf8", // Indigo
    "#f43f5e"  // Rose
  ];

  const particleCount = options.particleCount || 55;
  const particles = [];
  const startX = (options.x != null ? options.x : window.innerWidth / 2) * dpr;
  const startY = (options.y != null ? options.y : window.innerHeight * 0.35) * dpr;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 9 + 4) * dpr;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (3 * dpr),
      size: (Math.random() * 5 + 4) * dpr,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      alpha: 1,
      decay: Math.random() * 0.015 + 0.012,
      gravity: 0.18 * dpr,
      shape: Math.random() > 0.4 ? "rect" : "circle"
    });
  }

  let animationFrameId;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.985;
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      if (p.alpha > 0) {
        activeCount++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (activeCount > 0 && elapsed < 3000) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  }

  animationFrameId = requestAnimationFrame(render);
}

/**
 * Display a high-contrast floating celebration banner
 */
export function showDelightBanner({ title, subtitle, badge = "ERFOLG" }) {
  if (typeof document === "undefined") return;

  const existing = document.querySelector(".delight-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.className = "delight-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = `
    <div class="delight-banner-content">
      <span class="delight-banner-badge">★ ${escapeHtml(badge)}</span>
      <div class="delight-banner-text">
        <strong>${escapeHtml(title)}</strong>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.classList.add("is-visible");
  }, 20);

  setTimeout(() => {
    banner.classList.remove("is-visible");
    setTimeout(() => banner.remove(), 400);
  }, 4200);
}

/**
 * Master Delight trigger: Confetti + Chime + Haptic + Optional Banner
 */
export function triggerDelight(options = {}) {
  triggerConfetti(options);
  if (options.sound !== false) {
    playChime();
  }
  triggerHaptic("timer-finished");

  if (options.title) {
    showDelightBanner({
      title: options.title,
      subtitle: options.subtitle || options.message,
      badge: options.badge || "MEILENSTEIN"
    });
  }
}

/**
 * Check if a newly entered value completes any active goal or milestone
 */
export function evaluateGoalDelight(activeGoals = [], newValue, goalType = GOAL_TYPES.WEIGHT, previousValue = null) {
  if (!activeGoals || !activeGoals.length || newValue == null) return;

  const relevantGoals = activeGoals.filter((g) => g.type === goalType && g.status !== "completed" && g.status !== "cancelled");
  const unit = goalType === GOAL_TYPES.BODY_FAT ? "%" : "kg";

  for (const goal of relevantGoals) {
    const direction = getDirectionFactor(goal); // -1 if cutting/losing, 1 if gaining/bulking

    // 1. Check full goal completion
    const isGoalReached = (goal.targetValue - newValue) * direction <= 0;
    const wasGoalReached = previousValue != null && (goal.targetValue - previousValue) * direction <= 0;

    if (isGoalReached && !wasGoalReached) {
      triggerDelight({
        title: "Hauptziel erreicht!",
        subtitle: `Du hast dein Ziel von ${formatNumber(goal.targetValue, { maximumFractionDigits: 1 })} ${unit} erfolgreich erreicht!`,
        badge: "ZIEL ERREICHT"
      });
      return;
    }

    // 2. Check milestone completion
    if (goal.milestones && Array.isArray(goal.milestones)) {
      for (let i = 0; i < goal.milestones.length; i++) {
        const ms = goal.milestones[i];
        if (!ms || ms.targetValue == null) continue;

        const isMsReached = (ms.targetValue - newValue) * direction <= 0;
        const wasMsReached = previousValue != null && (ms.targetValue - previousValue) * direction <= 0;

        if (isMsReached && !wasMsReached) {
          triggerDelight({
            title: "Meilenstein erreicht!",
            subtitle: `${ms.label || `Zwischenziel ${i + 1}`}: ${formatNumber(ms.targetValue, { maximumFractionDigits: 1 })} ${unit} geschafft!`,
            badge: "MEILENSTEIN"
          });
          return;
        }
      }
    }
  }
}
