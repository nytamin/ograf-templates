/**
 * Fragmented Trapezoid Lower Third Module
 * High-impact news/sports design with slanted blocks, neon glow line, and staggered character reveals.
 * Features trapezoid geometry with 15-degree slants and animated neon accents.
 */

const DEFAULT_STATE = {
  name: "Jordan Hayes",
  title: "Senior Correspondent",
  accentColor: "#ffb800",
  primaryColor: "#1a2a4e",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(255, 255, 255, 0.98);
  --accent: #ffb800;
  --primary: #1a2a4e;
}

* {
  box-sizing: border-box;
}

.scene {
  position: absolute;
  left: max(5vw, 72px);
  bottom: calc(max(6vh, 72px) + env(safe-area-inset-bottom));
  will-change: transform;
}

.block-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.title-block {
  position: relative;
  padding: 14px 32px;
  background: var(--accent);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  transform: translateX(-100%);
  will-change: transform;
  z-index: 1;
}

.title-text {
  font-size: clamp(22px, 1.6vw, 28px);
  font-weight: 600;
  letter-spacing: 0.03em;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.98);
  text-transform: uppercase;
}

.name-block {
  position: relative;
  margin-top: 2px;
  padding: 22px 44px 22px 32px;
  background: linear-gradient(135deg, var(--primary) 0%, rgba(26, 42, 78, 0.85) 100%);
  backdrop-filter: blur(8px);
  clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
  will-change: clip-path;
  z-index: 2;
  margin-left: 28px;
}

.name-text {
  font-size: clamp(42px, 3vw, 56px);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.1;
  text-shadow:
    0 4px 12px rgba(0, 0, 0, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.3);
}

.name-text .char {
  display: inline-block;
  opacity: 0;
  transform: translateY(10px);
  will-change: opacity, transform;
}

.glow-line {
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
  box-shadow:
    0 0 12px var(--accent),
    0 0 24px rgba(255, 184, 0, 0.5);
  opacity: 0;
  transform: scaleX(0);
  will-change: opacity, transform;
}

@media (prefers-reduced-motion: reduce) {
  .title-block,
  .name-block,
  .name-text .char,
  .glow-line {
    transition: none;
  }
}
`;

class FragmentedTrapezoidLowerThird extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animations = [];

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const scene = document.createElement("div");
    scene.className = "scene";

    const container = document.createElement("div");
    container.className = "block-container";

    const titleBlock = document.createElement("div");
    titleBlock.className = "title-block";

    const titleText = document.createElement("div");
    titleText.className = "title-text";

    const nameBlock = document.createElement("div");
    nameBlock.className = "name-block";

    const nameText = document.createElement("div");
    nameText.className = "name-text";

    const glowLine = document.createElement("div");
    glowLine.className = "glow-line";

    titleBlock.append(titleText);
    nameBlock.append(nameText);
    container.append(titleBlock, nameBlock, glowLine);
    scene.append(container);
    root.append(style, scene);

    this._elements = { scene, titleBlock, titleText, nameBlock, nameText, glowLine };

    // Set initial hidden state immediately to prevent flash
    titleBlock.style.transform = "translateX(-100%)";
    titleBlock.style.opacity = "0";
    nameBlock.style.clipPath = "polygon(0 0, 0 0, 0 100%, 0 100%)";
    glowLine.style.opacity = "0";
    glowLine.style.transform = "scaleX(0)";
  }

  connectedCallback() {
    this._resetState();
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
        document.fonts.load("800 52px Inter"),
        document.fonts.load("600 26px Inter"),
      ]).catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    this._cancelAnimations();
    this._elements.scene.remove();
    this.shadowRoot.innerHTML = "";
    return { statusCode: 200 };
  }

  async playAction(params) {
    const targetStep = this._resolveTargetStep(params);
    const skipAnimation = params?.skipAnimation === true;

    if (targetStep === undefined) {
      this._currentStep = undefined;
    } else {
      await this._animateIn(skipAnimation);
      this._currentStep = targetStep;
    }

    return {
      statusCode: 200,
      currentStep: this._currentStep,
    };
  }

  async stopAction(params) {
    const skipAnimation = params?.skipAnimation === true;
    await this._animateOut(skipAnimation);
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
    const { name, title, accentColor, primaryColor } = this._state;
    const { titleText, nameText } = this._elements;

    titleText.textContent = title || "";

    // Split name into characters for staggered animation
    nameText.innerHTML = "";
    const chars = (name || "").split("");
    chars.forEach((char) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = char === " " ? "\u00A0" : char;
      nameText.appendChild(span);
    });

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
    }
    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
    }
  }

  _resetState() {
    const { titleBlock, nameBlock, glowLine } = this._elements;

    titleBlock.style.transform = "translateX(-100%)";
    titleBlock.style.opacity = "0";
    nameBlock.style.clipPath = "polygon(0 0, 0 0, 0 100%, 0 100%)";
    glowLine.style.opacity = "0";
    glowLine.style.transform = "scaleX(0)";

    const chars = this._elements.nameText.querySelectorAll(".char");
    chars.forEach((char) => {
      char.style.opacity = "0";
      char.style.transform = "translateY(10px)";
    });
  }

  _cancelAnimations() {
    this._animations.forEach((anim) => anim.cancel && anim.cancel());
    this._animations = [];
  }

  async _animateIn(skipAnimation) {
    if (this._isVisible) {
      return Promise.resolve();
    }

    this._isVisible = true;
    this._cancelAnimations();

    if (skipAnimation) {
      this._elements.titleBlock.style.transform = "translateX(0)";
      this._elements.titleBlock.style.opacity = "1";
      this._elements.nameBlock.style.clipPath = "polygon(0 0, calc(100% - 24px) 0, 100% 100%, 0 100%)";
      this._elements.glowLine.style.opacity = "1";
      this._elements.glowLine.style.transform = "scaleX(1)";

      const chars = this._elements.nameText.querySelectorAll(".char");
      chars.forEach((char) => {
        char.style.opacity = "1";
        char.style.transform = "translateY(0)";
      });

      return Promise.resolve();
    }

    const promises = [];

    // Step 1: Title block slides in (300ms, ease-out)
    const titleAnim = this._elements.titleBlock.animate(
      [
        { transform: "translateX(-100%)", opacity: 0 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      {
        duration: 300,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(titleAnim);
    promises.push(titleAnim.finished);

    // Step 2: Name block unfurls (400ms, delayed 100ms, ease-out)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const nameAnim = this._elements.nameBlock.animate(
      [
        { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" },
        { clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 100%, 0 100%)" },
      ],
      {
        duration: 400,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(nameAnim);
    promises.push(nameAnim.finished);

    // Step 3: Stagger name characters in (each 30ms apart, overlapping with name block)
    await new Promise((resolve) => {
      setTimeout(() => {
        const chars = this._elements.nameText.querySelectorAll(".char");

        chars.forEach((char, index) => {
          setTimeout(() => {
            const charAnim = char.animate(
              [
                { opacity: 0, transform: "translateY(10px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 400,
                easing: "cubic-bezier(0.2, 0, 0, 1)",
                fill: "forwards",
              }
            );
            this._animations.push(charAnim);
            if (index === chars.length - 1) {
              promises.push(charAnim.finished);
            }
          }, index * 30);
        });

        resolve();
      }, 200);
    });

    // Step 4: Glow line draws from center
    await new Promise((resolve) => setTimeout(resolve, 200));

    const glowAnim = this._elements.glowLine.animate(
      [
        { opacity: 0, transform: "scaleX(0)" },
        { opacity: 1, transform: "scaleX(1)" },
      ],
      {
        duration: 350,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(glowAnim);
    promises.push(glowAnim.finished);

    await Promise.all(promises).catch(() => undefined);
  }

  async _animateOut(skipAnimation) {
    if (!this._isVisible) {
      return Promise.resolve();
    }

    this._isVisible = false;
    this._cancelAnimations();

    if (skipAnimation) {
      this._resetState();
      return Promise.resolve();
    }

    const promises = [];

    // Glow line disappears instantly
    this._elements.glowLine.style.opacity = "0";

    // Both blocks collapse toward each other
    const titleAnim = this._elements.titleBlock.animate(
      [
        { transform: "translateX(0)", opacity: 1 },
        { transform: "translateX(200px)", opacity: 0 },
      ],
      {
        duration: 250,
        easing: "cubic-bezier(0.6, 0, 1, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(titleAnim);
    promises.push(titleAnim.finished);

    const nameAnim = this._elements.nameBlock.animate(
      [
        { clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 100%, 0 100%)", transform: "translateX(0)" },
        { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)", transform: "translateX(200px)" },
      ],
      {
        duration: 250,
        easing: "cubic-bezier(0.6, 0, 1, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(nameAnim);
    promises.push(nameAnim.finished);

    await Promise.all(promises).catch(() => undefined);
    this._resetState();
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
}

export default FragmentedTrapezoidLowerThird;
