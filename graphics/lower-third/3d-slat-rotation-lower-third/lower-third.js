/**
 * 3D Slat Rotation Lower Third Module
 * Modern network identity design with 3D rotating rectangular slats.
 * Features thick "physical" slabs with shaded edges and glossy finish with traveling light flare.
 */

const DEFAULT_STATE = {
  name: "Marcus Williams",
  title: "Political Analyst",
  primaryColor: "#2a3a5c",
  accentColor: "#e0a040",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(255, 255, 255, 0.98);
  --primary-color: #2a3a5c;
  --accent-color: #e0a040;
}

* {
  box-sizing: border-box;
}

.scene {
  position: absolute;
  left: max(5vw, 72px);
  bottom: calc(max(6vh, 72px) + env(safe-area-inset-bottom));
  perspective: 1200px;
  will-change: transform;
}

.slat-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slat {
  position: relative;
  transform-origin: center center;
  transform-style: preserve-3d;
  will-change: transform;
}

.name-slat {
  width: clamp(580px, 55vw, 780px);
  transform: rotateX(-90deg);
}

.title-slat {
  width: clamp(480px, 45vw, 650px);
  margin-left: 32px;
  transform: rotateX(-90deg);
}

.slat-face {
  position: relative;
  padding: 24px 40px;
  background: var(--primary-color);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 6px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -2px 0 rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
}

.slat-face::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 40%,
    transparent 60%,
    rgba(0, 0, 0, 0.1) 100%
  );
  pointer-events: none;
}

.slat-face::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -100%;
  width: 80px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  opacity: 0;
  pointer-events: none;
  will-change: left, opacity;
}

.title-slat .slat-face {
  background: linear-gradient(135deg, var(--accent-color) 0%, rgba(224, 160, 64, 0.85) 100%);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 6px 20px rgba(0, 0, 0, 0.3),
    0 0 30px rgba(224, 160, 64, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2);
}

.slat-text {
  position: relative;
  z-index: 1;
  opacity: 0;
  transform: scale(0.9);
  will-change: opacity, transform;
}

.name-text {
  font-size: clamp(42px, 3vw, 54px);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.1;
  text-shadow:
    0 4px 12px rgba(0, 0, 0, 0.6),
    0 2px 6px rgba(0, 0, 0, 0.4);
}

.title-text {
  font-size: clamp(26px, 1.9vw, 34px);
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
  text-transform: uppercase;
  text-shadow:
    0 3px 10px rgba(0, 0, 0, 0.5),
    0 2px 5px rgba(0, 0, 0, 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .slat {
    transition: none;
  }

  .slat-face::after {
    display: none;
  }
}
`;

class ThreeDSlatRotationLowerThird extends HTMLElement {
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
    container.className = "slat-container";

    // Name slat (top)
    const nameSlat = document.createElement("div");
    nameSlat.className = "slat name-slat";

    const nameFace = document.createElement("div");
    nameFace.className = "slat-face";

    const nameText = document.createElement("div");
    nameText.className = "slat-text name-text";

    nameFace.append(nameText);
    nameSlat.append(nameFace);

    // Title slat (bottom)
    const titleSlat = document.createElement("div");
    titleSlat.className = "slat title-slat";

    const titleFace = document.createElement("div");
    titleFace.className = "slat-face";

    const titleText = document.createElement("div");
    titleText.className = "slat-text title-text";

    titleFace.append(titleText);
    titleSlat.append(titleFace);

    container.append(nameSlat, titleSlat);
    scene.append(container);
    root.append(style, scene);

    this._elements = { scene, nameSlat, titleSlat, nameText, titleText, nameFace, titleFace };
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
        document.fonts.load("800 50px Inter"),
        document.fonts.load("600 30px Inter"),
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
    const { name, title, primaryColor, accentColor } = this._state;
    const { nameText, titleText } = this._elements;

    nameText.textContent = name || "";
    titleText.textContent = title || "";

    if (primaryColor) {
      this.style.setProperty("--primary-color", primaryColor);
    }
    if (accentColor) {
      this.style.setProperty("--accent-color", accentColor);
    }
  }

  _resetState() {
    const { nameSlat, titleSlat, nameText, titleText } = this._elements;

    nameSlat.style.transform = "rotateX(-90deg)";
    titleSlat.style.transform = "rotateX(-90deg)";
    nameText.style.opacity = "0";
    nameText.style.transform = "scale(0.9)";
    titleText.style.opacity = "0";
    titleText.style.transform = "scale(0.9)";
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
      this._elements.nameSlat.style.transform = "rotateX(0deg)";
      this._elements.titleSlat.style.transform = "rotateX(0deg)";
      this._elements.nameText.style.opacity = "1";
      this._elements.nameText.style.transform = "scale(1)";
      this._elements.titleText.style.opacity = "1";
      this._elements.titleText.style.transform = "scale(1)";
      return Promise.resolve();
    }

    const promises = [];

    // Step 1: Name slat rotates into view (500ms)
    const nameSlatAnim = this._elements.nameSlat.animate(
      [
        { transform: "rotateX(-90deg)" },
        { transform: "rotateX(0deg)" },
      ],
      {
        duration: 500,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(nameSlatAnim);
    promises.push(nameSlatAnim.finished);

    // Step 2: Title slat rotates into view (500ms, delayed 80ms)
    await new Promise((resolve) => setTimeout(resolve, 80));

    const titleSlatAnim = this._elements.titleSlat.animate(
      [
        { transform: "rotateX(-90deg)" },
        { transform: "rotateX(0deg)" },
      ],
      {
        duration: 500,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(titleSlatAnim);
    promises.push(titleSlatAnim.finished);

    // Step 3: Text appears with bounce while slats are rotating (overlapping)
    await new Promise((resolve) => setTimeout(resolve, 150));

    const nameTextAnim = this._elements.nameText.animate(
      [
        { opacity: 0, transform: "scale(0.9)" },
        { opacity: 1, transform: "scale(1.05)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        duration: 400,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", // Back-out easing
        fill: "forwards",
      }
    );
    this._animations.push(nameTextAnim);

    const titleTextAnim = this._elements.titleText.animate(
      [
        { opacity: 0, transform: "scale(0.9)" },
        { opacity: 1, transform: "scale(1.05)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        duration: 400,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(titleTextAnim);

    await Promise.all([nameTextAnim.finished, titleTextAnim.finished]).catch(() => undefined);

    // Step 4: Light flare on title slat
    const flareAnim = this._elements.titleFace.animate(
      [
        { "::after": { left: "-100%", opacity: 0 } },
        { "::after": { left: "0%", opacity: 1 } },
        { "::after": { left: "100%", opacity: 0 } },
      ],
      {
        duration: 800,
        easing: "ease-in-out",
        pseudoElement: "::after",
      }
    );
    this._animations.push(flareAnim);

    // Manually animate the pseudo-element
    this._animateFlare(this._elements.titleFace);
  }

  _animateFlare(element) {
    const style = element.querySelector("style") || document.createElement("style");
    if (!element.querySelector("style")) {
      element.appendChild(style);
    }

    let progress = 0;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      progress = Math.min(elapsed / duration, 1);

      const position = -100 + progress * 200; // -100% to 100%
      const opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

      style.textContent = `
        .slat-face::after {
          left: ${position}% !important;
          opacity: ${opacity} !important;
        }
      `;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
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

    // Slats continue rotation another 90 degrees (200ms each, faster exit)
    const nameSlatAnim = this._elements.nameSlat.animate(
      [
        { transform: "rotateX(0deg)" },
        { transform: "rotateX(90deg)" },
      ],
      {
        duration: 200,
        easing: "cubic-bezier(0.6, 0, 1, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(nameSlatAnim);
    promises.push(nameSlatAnim.finished);

    const titleSlatAnim = this._elements.titleSlat.animate(
      [
        { transform: "rotateX(0deg)" },
        { transform: "rotateX(90deg)" },
      ],
      {
        duration: 200,
        easing: "cubic-bezier(0.6, 0, 1, 1)",
        fill: "forwards",
      }
    );
    this._animations.push(titleSlatAnim);
    promises.push(titleSlatAnim.finished);

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

export default ThreeDSlatRotationLowerThird;
