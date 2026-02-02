const DEFAULT_STATE = {
  title: "CYBER CITY",
  subtitle: "neon.broadcast.live",
  neonColor: "#00ff41",
  accentColor: "#ff00ff",
};

const STYLE_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');

:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Audiowide", sans-serif;
  --neon: #00ff41;
  --accent: #ff00ff;
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
  gap: 8px;
  max-width: 80vw;
}

.title {
  font-size: 72px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0;
  color: var(--neon);
  text-shadow:
    0 0 10px var(--neon),
    0 0 20px var(--neon),
    0 0 40px var(--neon),
    0 0 80px var(--neon);
  filter: brightness(1.2) drop-shadow(0 0 8px var(--neon));
}

.subtitle {
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 0.06em;
  opacity: 0;
  color: var(--accent);
  text-shadow:
    0 0 8px var(--accent),
    0 0 16px var(--accent),
    0 0 32px var(--accent);
  filter: brightness(1.1) drop-shadow(0 0 6px var(--accent));
}

@keyframes neon-flicker {
  0%, 100% {
    text-shadow:
      0 0 10px var(--neon),
      0 0 20px var(--neon),
      0 0 40px var(--neon),
      0 0 80px var(--neon);
    opacity: 1;
  }
  10% {
    text-shadow:
      0 0 5px var(--neon),
      0 0 10px var(--neon);
    opacity: 0.8;
  }
  15% {
    text-shadow:
      0 0 10px var(--neon),
      0 0 20px var(--neon),
      0 0 40px var(--neon),
      0 0 80px var(--neon);
    opacity: 1;
  }
  20% {
    text-shadow:
      0 0 8px var(--neon),
      0 0 15px var(--neon);
    opacity: 0.85;
  }
  25%, 100% {
    text-shadow:
      0 0 10px var(--neon),
      0 0 20px var(--neon),
      0 0 40px var(--neon),
      0 0 80px var(--neon);
    opacity: 1;
  }
}

@keyframes glow-pulse {
  0%, 100% {
    filter: brightness(1.2) drop-shadow(0 0 8px var(--neon));
  }
  50% {
    filter: brightness(1.5) drop-shadow(0 0 20px var(--neon));
  }
}

.title.active {
  animation: neon-flicker 4s ease-in-out infinite;
}

.title.active::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  animation: glow-pulse 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .title,
  .subtitle {
    transition: none;
  }
  .title.active,
  .title.active::after {
    animation: none;
  }
}
`;

class NeonLowerThird extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animation = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const container = document.createElement("div");
    container.className = "lower-third-container";

    const title = document.createElement("div");
    title.className = "title";

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle";

    container.append(title, subtitle);
    root.append(style, container);

    this._elements = { container, title, subtitle };
  }

  connectedCallback() {
    this._elements.title.style.opacity = "0";
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
      await document.fonts.load("400 72px Audiowide").catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    this._elements.title.classList.remove("active");
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
    this._elements.title.classList.remove("active");
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
    const { title, subtitle, neonColor, accentColor } = this._state;
    const { title: titleEl, subtitle: subtitleEl } = this._elements;

    titleEl.textContent = title || "";
    subtitleEl.textContent = subtitle || "";

    this.style.setProperty("--neon", neonColor || "#00ff41");
    this.style.setProperty("--accent", accentColor || "#ff00ff");
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

  _animateTo(visible, skipAnimation) {
    if (this._isVisible === visible) {
      return Promise.resolve();
    }

    this._isVisible = visible;
    const { title, subtitle } = this._elements;

    // Cancel any existing animations
    if (Array.isArray(this._animation)) {
      this._animation.forEach((anim) => {
        if (anim && anim.cancel) {
          anim.cancel();
        }
      });
    }
    this._animation = null;

    if (skipAnimation) {
      title.style.opacity = visible ? "1" : "0";
      subtitle.style.opacity = visible ? "1" : "0";
      if (visible) {
        title.classList.add("active");
      } else {
        title.classList.remove("active");
      }
      return Promise.resolve();
    }

    const animations = [
      title.animate(
        visible
          ? [
              { opacity: 0, filter: "blur(20px) brightness(0)" },
              { opacity: 0.6, filter: "blur(10px) brightness(0.8)" },
              { opacity: 1, filter: "blur(0px) brightness(1.2)" },
            ]
          : [
              { opacity: 1, filter: "blur(0px) brightness(1.2)" },
              { opacity: 0.6, filter: "blur(10px) brightness(0.8)" },
              { opacity: 0, filter: "blur(20px) brightness(0)" },
            ],
        {
          duration: visible ? 900 : 400,
          easing: visible
            ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "cubic-bezier(0.6, 0, 0.4, 1)",
          fill: "forwards",
        }
      ),
      subtitle.animate(
        visible
          ? [
              { opacity: 0, filter: "blur(15px)" },
              { opacity: 1, filter: "blur(0px)" },
            ]
          : [
              { opacity: 1, filter: "blur(0px)" },
              { opacity: 0, filter: "blur(15px)" },
            ],
        {
          duration: visible ? 700 : 300,
          delay: visible ? 200 : 0,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "forwards",
        }
      ),
    ];

    // Store animation array for cancellation
    this._animation = animations;

    if (visible) {
      setTimeout(() => {
        if (this._isVisible) {
          title.classList.add("active");
        }
      }, 500);
    } else {
      title.classList.remove("active");
    }

    return Promise.all(animations.map((a) => a.finished)).catch(
      () => undefined
    );
  }
}

export default NeonLowerThird;
