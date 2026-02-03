/**
 * Glassmorphism Billboard Module
 * Displays sponsor/presenter information with frosted glass aesthetic and smooth fade animations.
 * Supports title visibility toggle and customizable tagline and branding.
 */

const DEFAULT_STATE = {
  title: "Presented By",
  sponsor: "Sponsor Name",
  tagline: "Official Partner",
  showTitle: true,
  accentColor: "#3498db",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(245, 248, 255, 0.95);
  --accent: #3498db;
}

* {
  box-sizing: border-box;
}

.billboard-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 16, 24, 0.4);
  backdrop-filter: blur(12px);
  opacity: 0;
  will-change: opacity;
}

.billboard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transform: scale(0.85);
  opacity: 0;
  will-change: transform, opacity;
}

.billboard-glass {
  position: relative;
  padding: 64px 96px;
  border-radius: 32px;
  background: linear-gradient(135deg, rgba(16, 24, 36, 0.82), rgba(22, 30, 48, 0.5));
  border: 2px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 32px 96px rgba(10, 16, 24, 0.5),
    inset 0 2px 0 rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(24px) saturate(150%);
  min-width: clamp(720px, 50vw, 1200px);
}

.title-text {
  font-size: clamp(36px, 2.8vw, 48px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(220, 230, 244, 0.9);
  margin-bottom: 24px;
}

.title-text[hidden] {
  display: none;
}

.sponsor-name {
  font-size: clamp(72px, 6vw, 120px);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.1;
  background: linear-gradient(135deg, var(--accent), rgba(255, 255, 255, 0.9));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  margin-bottom: 20px;
  position: relative;
}

.sponsor-name::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  z-index: -1;
  text-shadow: 0 8px 32px rgba(52, 152, 219, 0.6);
  -webkit-text-fill-color: transparent;
}

.tagline-text {
  font-size: clamp(32px, 2.4vw, 44px);
  font-weight: 500;
  letter-spacing: 0.05em;
  color: rgba(220, 230, 244, 0.85);
  text-transform: uppercase;
}

.tagline-text:empty {
  display: none;
}

.accent-glow-top {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 999px;
  box-shadow: 0 0 24px var(--accent);
}

.accent-glow-bottom {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 999px;
  box-shadow: 0 0 24px var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .billboard-overlay,
  .billboard-container {
    transition: none;
  }
}
`;

class GlassmorphismBillboard extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._overlayAnimation = null;
    this._containerAnimation = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const overlay = document.createElement("div");
    overlay.className = "billboard-overlay";

    const container = document.createElement("div");
    container.className = "billboard-container";

    const glass = document.createElement("div");
    glass.className = "billboard-glass";

    const glowTop = document.createElement("div");
    glowTop.className = "accent-glow-top";

    const title = document.createElement("div");
    title.className = "title-text";

    const sponsor = document.createElement("div");
    sponsor.className = "sponsor-name";

    const tagline = document.createElement("div");
    tagline.className = "tagline-text";

    const glowBottom = document.createElement("div");
    glowBottom.className = "accent-glow-bottom";

    glass.append(glowTop, title, sponsor, tagline, glowBottom);
    container.append(glass);
    overlay.append(container);
    root.append(style, overlay);

    this._elements = { overlay, container, title, sponsor, tagline };
  }

  connectedCallback() {
    this._elements.overlay.style.opacity = "0";
    this._elements.container.style.opacity = "0";
    this._elements.container.style.transform = "scale(0.85)";
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
        document.fonts.load("900 120px Inter"),
        document.fonts.load("600 48px Inter"),
      ]).catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    this._elements.overlay.remove();
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
    const { title, sponsor, tagline, showTitle, accentColor } = this._state;
    const { title: titleEl, sponsor: sponsorEl, tagline: taglineEl } = this._elements;

    titleEl.textContent = title || "";
    titleEl.hidden = !showTitle;

    sponsorEl.textContent = sponsor || "";
    sponsorEl.setAttribute("data-text", sponsor || "");

    taglineEl.textContent = tagline || "";

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
    }
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
    const { overlay, container } = this._elements;

    if (this._overlayAnimation) {
      this._overlayAnimation.cancel();
      this._overlayAnimation = null;
    }
    if (this._containerAnimation) {
      this._containerAnimation.cancel();
      this._containerAnimation = null;
    }

    if (skipAnimation) {
      overlay.style.opacity = visible ? "1" : "0";
      container.style.opacity = visible ? "1" : "0";
      container.style.transform = visible ? "scale(1)" : "scale(0.85)";
      return Promise.resolve();
    }

    const overlayFrom = { opacity: visible ? 0 : 1 };
    const overlayTo = { opacity: visible ? 1 : 0 };

    const containerFrom = visible
      ? { opacity: 0, transform: "scale(0.85)" }
      : { opacity: 1, transform: "scale(1)" };
    const containerTo = visible
      ? { opacity: 1, transform: "scale(1)" }
      : { opacity: 0, transform: "scale(0.85)" };

    this._overlayAnimation = overlay.animate([overlayFrom, overlayTo], {
      duration: 500,
      easing: "ease",
      fill: "forwards",
    });

    this._containerAnimation = container.animate([containerFrom, containerTo], {
      duration: 500,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fill: "forwards",
      delay: visible ? 100 : 0,
    });

    return Promise.all([
      this._overlayAnimation.finished.catch(() => undefined),
      this._containerAnimation.finished.catch(() => undefined),
    ]).finally(() => {
      overlay.style.opacity = visible ? "1" : "0";
      container.style.opacity = visible ? "1" : "0";
      container.style.transform = visible ? "scale(1)" : "scale(0.85)";
      this._overlayAnimation = null;
      this._containerAnimation = null;
    });
  }
}

export default GlassmorphismBillboard;
