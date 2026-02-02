const DEFAULT_STATE = {
  title: "Breaking News",
  subtitle: "Live from the field",
  glitchColor1: "#ff0055",
  glitchColor2: "#00ffff",
  textColor: "#ffffff",
};

const STYLE_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&display=swap');

:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Space Mono", monospace;
  --glitch1: #ff0055;
  --glitch2: #00ffff;
  --text-color: #ffffff;
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
  gap: 4px;
  max-width: 80vw;
}

.glitch-wrapper {
  position: relative;
  display: inline-block;
  width: fit-content;
}

.glitch-text {
  font-size: 68px;
  font-weight: 700;
  color: var(--text-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  opacity: 0;
  position: relative;
  z-index: 2;
  text-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.glitch-text::before {
  color: var(--glitch1);
  text-shadow: -1px -1px 0 var(--glitch2), 1px 1px 0 var(--glitch2);
  mix-blend-mode: screen;
  clip-path: inset(0);
}

.glitch-text::after {
  color: var(--glitch2);
  text-shadow: 1px 1px 0 var(--glitch1), -1px -1px 0 var(--glitch1);
  mix-blend-mode: multiply;
  clip-path: inset(0);
}

.subtitle {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: 0.06em;
  opacity: 0;
}

@keyframes glitch-pulse {
  0%, 100% {
    clip-path: inset(0);
    opacity: 0.4;
    transform: translate(0, 0);
  }
  20% {
    clip-path: inset(40% 0 0 0);
    opacity: 0.3;
    transform: translate(-2px, 1px);
  }
  40% {
    clip-path: inset(20% 0 40% 0);
    opacity: 0.35;
    transform: translate(2px, -1px);
  }
  60% {
    clip-path: inset(60% 0 10% 0);
    opacity: 0.32;
    transform: translate(-2px, 2px);
  }
  80% {
    clip-path: inset(10% 0 60% 0);
    opacity: 0.38;
    transform: translate(1px, -2px);
  }
}

.glitch-text.active::before,
.glitch-text.active::after {
  animation: glitch-pulse 0.8s steps(2) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .glitch-text,
  .subtitle {
    transition: none;
  }
}
`;

class GlitchLowerThird extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animation = null;
    this._glitchInterval = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const container = document.createElement("div");
    container.className = "lower-third-container";

    const titleWrapper = document.createElement("div");
    titleWrapper.className = "glitch-wrapper";

    const titleText = document.createElement("div");
    titleText.className = "glitch-text";

    titleWrapper.appendChild(titleText);

    const subtitleText = document.createElement("div");
    subtitleText.className = "subtitle";

    container.append(titleWrapper, subtitleText);
    root.append(style, container);

    this._elements = { container, titleText, subtitleText };
  }

  connectedCallback() {
    this._elements.titleText.style.opacity = "0";
    this._elements.subtitleText.style.opacity = "0";
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
      await document.fonts.load("700 68px Space Mono").catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    this._stopGlitch();
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
    this._stopGlitch();
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
    const { title, subtitle, glitchColor1, glitchColor2, textColor } = this._state;
    const { titleText, subtitleText } = this._elements;

    titleText.textContent = title || "";
    titleText.setAttribute("data-text", title || "");
    subtitleText.textContent = subtitle || "";

    this.style.setProperty("--glitch1", glitchColor1 || "#ff0055");
    this.style.setProperty("--glitch2", glitchColor2 || "#00ffff");
    this.style.setProperty("--text-color", textColor || "#ffffff");
  }

  _stopGlitch() {
    if (this._glitchInterval) {
      clearInterval(this._glitchInterval);
      this._glitchInterval = null;
    }
    this._elements.titleText.classList.remove("active");
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
    const { titleText, subtitleText } = this._elements;

    if (this._animation) {
      this._animation.cancel();
      this._animation = null;
    }

    if (skipAnimation) {
      titleText.style.opacity = visible ? "1" : "0";
      subtitleText.style.opacity = visible ? "1" : "0";
      if (visible) {
        titleText.classList.add("active");
      } else {
        titleText.classList.remove("active");
      }
      return Promise.resolve();
    }

    // Ensure glitch animation is stopped before animating out
    if (!visible) {
      titleText.classList.remove("active");
    }

    // Build keyframes based on direction
    const titleKeyframes = visible
      ? [
          { opacity: 0, transform: "translate3d(-20px, 0, 0) skewX(10deg)" },
          { opacity: 0.5, transform: "translate3d(5px, 0, 0) skewX(-5deg)" },
          { opacity: 1, transform: "translate3d(0, 0, 0) skewX(0deg)" },
        ]
      : [
          { opacity: 1, transform: "translate3d(0, 0, 0) skewX(0deg)" },
          { opacity: 0.5, transform: "translate3d(-10px, 0, 0) skewX(8deg)" },
          { opacity: 0, transform: "translate3d(-30px, 0, 0) skewX(15deg)" },
        ];

    const subtitleKeyframes = visible
      ? [
          { opacity: 0, transform: "translate3d(20px, 0, 0)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ]
      : [
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
          { opacity: 0, transform: "translate3d(20px, 0, 0)" },
        ];

    // Animate in with glitch effect
    const animations = [
      titleText.animate(titleKeyframes, {
        duration: visible ? 800 : 400,
        easing: visible ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "cubic-bezier(0.6, 0, 0.4, 1)",
        fill: "forwards",
      }),
      subtitleText.animate(subtitleKeyframes, {
        duration: visible ? 600 : 300,
        delay: visible ? 200 : 0,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        fill: "forwards",
      }),
    ];

    if (visible) {
      // Occasional micro-glitches
      this._stopGlitch();
      this._glitchInterval = setInterval(() => {
        if (!this._isVisible) {
          return;
        }
        titleText.classList.add("active");
        const burstDuration = 120 + Math.random() * 180;
        setTimeout(() => {
          titleText.classList.remove("active");
        }, burstDuration);
      }, 1500 + Math.random() * 1500);
    }

    return Promise.all(animations.map((a) => a.finished)).catch(() => undefined);
  }
}

export default GlitchLowerThird;
