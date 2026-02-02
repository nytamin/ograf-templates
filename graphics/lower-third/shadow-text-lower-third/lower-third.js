const DEFAULT_STATE = {
  title: "John Smith",
  subtitle: "Chief Technology Officer",
  textColor: "#ffffff",
  shadowColor: "#000000",
  shadowIntensity: 0.8,
};

const STYLE_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap');

:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Montserrat", sans-serif;
  --text-color: #ffffff;
  --shadow-color: #000000;
  --shadow-intensity: 0.8;
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
  max-width: 70vw;
}

.title-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  perspective: 1000px;
}

.title-char {
  display: inline-block;
  font-size: 64px;
  font-weight: 900;
  color: var(--text-color);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  opacity: 0;
  transform: translate3d(0, 60px, -100px) rotateX(90deg);
  filter: blur(20px);
  will-change: transform, opacity, filter;
  text-shadow:
    0 8px 24px rgba(var(--shadow-rgb), calc(var(--shadow-intensity) * 0.9)),
    0 4px 12px rgba(var(--shadow-rgb), calc(var(--shadow-intensity) * 0.7)),
    0 2px 6px rgba(var(--shadow-rgb), calc(var(--shadow-intensity) * 0.5));
}

.title-char.space {
  width: 0.3em;
}

.subtitle-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  perspective: 800px;
  margin-left: 4px;
}

.subtitle-char {
  display: inline-block;
  font-size: 36px;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: 0.03em;
  opacity: 0;
  transform: translate3d(0, 40px, -80px) rotateX(80deg);
  filter: blur(15px);
  will-change: transform, opacity, filter;
  text-shadow:
    0 6px 18px rgba(var(--shadow-rgb), calc(var(--shadow-intensity) * 0.85)),
    0 3px 9px rgba(var(--shadow-rgb), calc(var(--shadow-intensity) * 0.65)),
    0 1px 4px rgba(var(--shadow-rgb), calc(var(--shadow-intensity) * 0.45));
}

.subtitle-char.space {
  width: 0.25em;
}

.subtitle-wrapper:empty {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .title-char,
  .subtitle-char {
    transition: none;
  }
}
`;

class ShadowTextLowerThird extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animations = [];

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const container = document.createElement("div");
    container.className = "lower-third-container";

    const titleWrapper = document.createElement("div");
    titleWrapper.className = "title-wrapper";

    const subtitleWrapper = document.createElement("div");
    subtitleWrapper.className = "subtitle-wrapper";

    container.append(titleWrapper, subtitleWrapper);
    root.append(style, container);

    this._elements = { container, titleWrapper, subtitleWrapper };
  }

  connectedCallback() {
    // Initial state set in _applyState
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
        document.fonts.load("900 64px Montserrat"),
        document.fonts.load("700 36px Montserrat"),
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
    const { title, subtitle, textColor, shadowColor, shadowIntensity } = this._state;
    const { titleWrapper, subtitleWrapper } = this._elements;

    // Update CSS variables
    this.style.setProperty("--text-color", textColor || "#ffffff");
    this.style.setProperty("--shadow-intensity", String(shadowIntensity ?? 0.8));

    // Convert shadow color to RGB for rgba usage
    const rgb = this._hexToRgb(shadowColor || "#000000");
    this.style.setProperty("--shadow-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    // Build title characters
    titleWrapper.innerHTML = "";
    const titleText = title || "";
    for (let i = 0; i < titleText.length; i++) {
      const char = titleText[i];
      const span = document.createElement("span");
      span.className = char === " " ? "title-char space" : "title-char";
      span.textContent = char === " " ? "\u00A0" : char;
      titleWrapper.appendChild(span);
    }

    // Build subtitle characters
    subtitleWrapper.innerHTML = "";
    const subtitleText = subtitle || "";
    for (let i = 0; i < subtitleText.length; i++) {
      const char = subtitleText[i];
      const span = document.createElement("span");
      span.className = char === " " ? "subtitle-char space" : "subtitle-char";
      span.textContent = char === " " ? "\u00A0" : char;
      subtitleWrapper.appendChild(span);
    }
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
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

  _cancelAnimations() {
    this._animations.forEach((anim) => {
      if (anim && anim.cancel) {
        anim.cancel();
      }
    });
    this._animations = [];
  }

  _animateTo(visible, skipAnimation) {
    if (this._isVisible === visible) {
      return Promise.resolve();
    }

    this._isVisible = visible;
    this._cancelAnimations();

    const titleChars = Array.from(this._elements.titleWrapper.querySelectorAll(".title-char"));
    const subtitleChars = Array.from(this._elements.subtitleWrapper.querySelectorAll(".subtitle-char"));

    if (skipAnimation) {
      const finalTransform = visible ? "translate3d(0, 0, 0) rotateX(0deg)" : "translate3d(0, 60px, -100px) rotateX(90deg)";
      const finalOpacity = visible ? "1" : "0";
      const finalBlur = visible ? "blur(0px)" : "blur(20px)";

      titleChars.forEach((char) => {
        char.style.transform = finalTransform;
        char.style.opacity = finalOpacity;
        char.style.filter = finalBlur;
      });

      subtitleChars.forEach((char) => {
        char.style.transform = visible ? "translate3d(0, 0, 0) rotateX(0deg)" : "translate3d(0, 40px, -80px) rotateX(80deg)";
        char.style.opacity = finalOpacity;
        char.style.filter = visible ? "blur(0px)" : "blur(15px)";
      });

      return Promise.resolve();
    }

    const promises = [];

    // Animate title characters
    titleChars.forEach((char, index) => {
      const delay = visible ? index * 40 : (titleChars.length - index - 1) * 30;
      const from = visible
        ? { transform: "translate3d(0, 60px, -100px) rotateX(90deg)", opacity: 0, filter: "blur(20px)" }
        : { transform: "translate3d(0, 0, 0) rotateX(0deg)", opacity: 1, filter: "blur(0px)" };
      const to = visible
        ? { transform: "translate3d(0, 0, 0) rotateX(0deg)", opacity: 1, filter: "blur(0px)" }
        : { transform: "translate3d(0, -40px, -100px) rotateX(-70deg)", opacity: 0, filter: "blur(20px)" };

      const animation = char.animate([from, to], {
        duration: visible ? 600 : 400,
        delay: delay,
        easing: visible ? "cubic-bezier(0.16, 1, 0.3, 1)" : "cubic-bezier(0.7, 0, 0.84, 0)",
        fill: "forwards",
      });

      this._animations.push(animation);
      promises.push(animation.finished.catch(() => undefined));
    });

    // Animate subtitle characters
    subtitleChars.forEach((char, index) => {
      const delay = visible ? 200 + index * 35 : (subtitleChars.length - index - 1) * 25;
      const from = visible
        ? { transform: "translate3d(0, 40px, -80px) rotateX(80deg)", opacity: 0, filter: "blur(15px)" }
        : { transform: "translate3d(0, 0, 0) rotateX(0deg)", opacity: 1, filter: "blur(0px)" };
      const to = visible
        ? { transform: "translate3d(0, 0, 0) rotateX(0deg)", opacity: 1, filter: "blur(0px)" }
        : { transform: "translate3d(0, -30px, -80px) rotateX(-60deg)", opacity: 0, filter: "blur(15px)" };

      const animation = char.animate([from, to], {
        duration: visible ? 550 : 350,
        delay: delay,
        easing: visible ? "cubic-bezier(0.16, 1, 0.3, 1)" : "cubic-bezier(0.7, 0, 0.84, 0)",
        fill: "forwards",
      });

      this._animations.push(animation);
      promises.push(animation.finished.catch(() => undefined));
    });

    return Promise.all(promises).then(() => {
      this._animations = [];
    });
  }
}

export default ShadowTextLowerThird;
