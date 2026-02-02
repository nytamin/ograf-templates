const DEFAULT_STATE = {
  title: "Live Event",
  subtitle: "Now Broadcasting",
  particleColor: "#5efcff",
  accentColor: "#ff7ad9",
};

const STYLE_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');

:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Poppins", sans-serif;
  --particle-color: #5efcff;
  --accent-color: #ff7ad9;
}

* {
  box-sizing: border-box;
}

.lower-third-container {
  position: absolute;
  left: max(5vw, 60px);
  bottom: calc(max(8vh, 96px) + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 80vw;
}

.particles-canvas {
  position: relative;
  display: flex;
  align-items: center;
  height: 80px;
  width: 100%;
}

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: var(--particle-color);
  border-radius: 50%;
  opacity: 0;
  box-shadow: 0 0 6px var(--particle-color);
  filter: drop-shadow(0 0 4px var(--particle-color));
  will-change: transform, opacity;
}

.subtitle {
  font-size: 28px;
  font-weight: 600;
  color: var(--accent-color);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 6px var(--particle-color); }
  50% { box-shadow: 0 0 14px var(--particle-color); }
}

.particle.active {
  animation: pulse-glow 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .particle,
  .subtitle {
    transition: none;
  }
}
`;

class ParticleLowerThird extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animations = [];
    this._particleElements = [];
    this._particleTargets = [];
    this._textCanvas = document.createElement("canvas");
    this._textContext = this._textCanvas.getContext("2d");

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const container = document.createElement("div");
    container.className = "lower-third-container";

    const particlesCanvas = document.createElement("div");
    particlesCanvas.className = "particles-canvas";

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle";

    container.append(particlesCanvas, subtitle);
    root.append(style, container);

    this._elements = { container, particlesCanvas, subtitle };
  }

  connectedCallback() {
    this._elements.subtitle.style.opacity = "0";
  }

  async load(params) {
    if (params.renderType !== "realtime") {
      return {
        statusCode: 400,
        statusMessage: "Non-realtime rendering is not supported.",
      };
    }

    this._state = { ...DEFAULT_STATE, ...(params.data || {}) };
    this._applyState();

    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load("800 80px Poppins"),
        document.fonts.load("600 28px Poppins"),
      ]).catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    this._cancelAnimations();
    this._elements.container.remove();
    this.shadowRoot.innerHTML = "";
    return { statusCode: 200 };
  }

  async playAction(params) {
    const targetStep = this._resolveTargetStep(params);
    const skipAnimation = params?.skipAnimation === true;

    if (targetStep === undefined) {
      this._currentStep = undefined;
    } else {
      await this._animateTo(true, skipAnimation);
      this._currentStep = targetStep;
    }

    return {
      statusCode: 200,
      currentStep: this._currentStep,
    };
  }

  async stopAction(params) {
    const skipAnimation = params?.skipAnimation === true;
    this._cancelAnimations();
    await this._animateTo(false, skipAnimation);
    this._currentStep = undefined;
    return { statusCode: 200 };
  }

  async updateAction(params) {
    this._state = { ...this._state, ...(params?.data || {}) };
    this._applyState();
    return { statusCode: 200 };
  }

  async customAction() {
    return { statusCode: 200 };
  }

  _applyState() {
    const { title, subtitle, particleColor, accentColor } = this._state;
    const { particlesCanvas, subtitle: subtitleEl } = this._elements;

    this.style.setProperty("--particle-color", particleColor || "#00d4ff");
    this.style.setProperty("--accent-color", accentColor || "#ff006e");

    subtitleEl.textContent = "";
    subtitleEl.style.opacity = "0";

    // Create particles based on text pixels
    particlesCanvas.innerHTML = "";
    this._particleElements = [];
    this._particleTargets = [];

    const titleText = title || "";
    const titleSize = 72;
    const subtitleSize = 32;
    const lineGap = 10;
    const fontFamily = "Poppins";
    const padding = 20;

    const ctx = this._textContext;
    if (!ctx) {
      return;
    }

    ctx.font = `800 ${titleSize}px ${fontFamily}`;
    const titleMetrics = ctx.measureText(titleText);
    ctx.font = `600 ${subtitleSize}px ${fontFamily}`;
    const subtitleMetrics = ctx.measureText(subtitle || "");
    const textWidth = Math.ceil(Math.max(titleMetrics.width, subtitleMetrics.width)) + padding * 2;
    const textHeight = titleSize + (subtitle ? lineGap + subtitleSize : 0) + padding * 2;

    this._textCanvas.width = Math.max(1, textWidth);
    this._textCanvas.height = Math.max(1, textHeight);

    ctx.clearRect(0, 0, this._textCanvas.width, this._textCanvas.height);
    ctx.font = `800 ${titleSize}px ${fontFamily}`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    ctx.fillText(titleText, padding, padding);
    if (subtitle) {
      ctx.font = `600 ${subtitleSize}px ${fontFamily}`;
      ctx.fillText(subtitle, padding, padding + titleSize + lineGap);
    }

    const imageData = ctx.getImageData(0, 0, this._textCanvas.width, this._textCanvas.height);
    const { data, width, height } = imageData;

    const step = 4;
    const maxParticles = 650;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 40) {
          this._particleTargets.push({ x, y });
          if (this._particleTargets.length >= maxParticles) {
            break;
          }
        }
      }
      if (this._particleTargets.length >= maxParticles) {
        break;
      }
    }

    // Map target positions to the visible canvas
    const canvasHeight = subtitle ? 120 : 90;
    const scale = Math.min(1, canvasHeight / textHeight);
    particlesCanvas.style.height = `${canvasHeight}px`;
    particlesCanvas.style.width = `${Math.ceil(textWidth * scale)}px`;

    this._particleTargets = this._particleTargets.map((point) => ({
      x: point.x * scale,
      y: point.y * scale,
    }));

    this._particleTargets.forEach((target, i) => {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.dataset.index = i;
      particlesCanvas.appendChild(particle);
      this._particleElements.push(particle);
    });

    if (this._isVisible) {
      this._particleElements.forEach((particle, index) => {
        const target = this._particleTargets[index] || { x: 0, y: 0 };
        particle.style.opacity = "1";
        particle.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) scale(1)`;
        particle.classList.add("active");
      });
    }
  }

  _cancelAnimations() {
    this._animations.forEach((anim) => {
      if (anim && anim.cancel) {
        anim.cancel();
      }
    });
    this._animations = [];
  }

  _resolveTargetStep(params) {
    const stepCount = 1;
    const goto = params?.goto;
    const delta = typeof params?.delta === "number" ? params.delta : 1;

    if (typeof goto === "number") {
      return goto >= stepCount ? undefined : Math.max(0, goto);
    }

    const current = typeof this._currentStep === "number" ? this._currentStep : -1;
    const target = current + delta;

    if (target >= stepCount) {
      return undefined;
    }

    return Math.max(0, target);
  }

  _getRandomPosition() {
    return {
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 200,
    };
  }

  _animateTo(visible, skipAnimation) {
    if (this._isVisible === visible) {
      return Promise.resolve();
    }

    this._isVisible = visible;
    this._cancelAnimations();

    const subtitle = this._elements.subtitle;
    const particles = this._particleElements;

    if (skipAnimation) {
      particles.forEach((p) => {
        p.style.opacity = visible ? "1" : "0";
        p.style.transform = visible
          ? "translate3d(0, 0, 0)"
          : "translate3d(0, -100px, 0)";
        if (visible) p.classList.add("active");
        else p.classList.remove("active");
      });
      subtitle.style.opacity = "0";
      return Promise.resolve();
    }

    const promises = [];

    // Animate particles
    particles.forEach((particle, index) => {
      const target = this._particleTargets[index] || { x: 0, y: 0 };
      const randomPos = this._getRandomPosition();
      if (!visible) {
        particle.style.opacity = "1";
        particle.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) scale(1)`;
        particle.classList.remove("active");
      }
      const from = visible
        ? {
            opacity: 0,
            transform: `translate3d(${randomPos.x}px, ${randomPos.y}px, 0) scale(0)`,
          }
        : {
            opacity: 1,
            transform: `translate3d(${target.x}px, ${target.y}px, 0) scale(1)`,
          };
      const to = visible
        ? {
            opacity: 1,
            transform: `translate3d(${target.x}px, ${target.y}px, 0) scale(1)`,
          }
        : {
            opacity: 0,
            transform: `translate3d(${randomPos.x}px, ${randomPos.y}px, 0) scale(0.2)`,
          };

      const delay = visible ? (index % 60) * 7 : (index % 60) * 6;

      const animation = particle.animate([from, to], {
        duration: visible ? 700 : 520,
        delay: delay,
        easing: visible
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "cubic-bezier(0.6, 0, 0.4, 1)",
        fill: "forwards",
      });

      animation.finished.then(() => {
        if (visible) {
          particle.classList.add("active");
        } else {
          particle.classList.remove("active");
        }
      });

      this._animations.push(animation);
      promises.push(animation.finished.catch(() => undefined));
    });

    subtitle.style.opacity = "0";

    return Promise.all(promises).catch(() => undefined);
  }
}

export default ParticleLowerThird;
