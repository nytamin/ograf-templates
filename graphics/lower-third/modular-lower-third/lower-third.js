/**
 * Modular Lower Third Module
 * Flexible lower-third graphic with independently animated blocks (main title and subtitle).
 * Features staggered animations, gradient accent bars, and customizable colors with smooth choreography.
 */

const BLOCK_CONFIG = {
  block1: {
    type: "text",
    contentKey: "mainTitle",
    colorKey: "mainTitleColor",
    fontSize: "56px",
    fontWeight: "700",
    inAnimationDuration: 600,
    inAnimationDelay: 0,
    inAnimationEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    outAnimationDuration: 300,
    outAnimationDelay: 0,
    outAnimationEasing: "cubic-bezier(0.6, 0, 0.4, 1)",
  },
  block2: {
    type: "text",
    contentKey: "subtitle",
    colorKey: "subtitleColor",
    fontSize: "40px",
    fontWeight: "500",
    inAnimationDuration: 500,
    inAnimationDelay: 100,
    inAnimationEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    outAnimationDuration: 300,
    outAnimationDelay: 0,
    outAnimationEasing: "cubic-bezier(0.6, 0, 0.4, 1)",
  },
  block3: {
    type: "mask",
    height: "4px",
    inAnimationDuration: 400,
    inAnimationDelay: 150,
    inAnimationEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    outAnimationDuration: 250,
    outAnimationDelay: 0,
    outAnimationEasing: "cubic-bezier(0.6, 0, 0.4, 1)",
  },
  block4: {
    type: "text",
    contentKey: "tertiaryText",
    colorKey: "tertiaryColor",
    fontSize: "28px",
    fontWeight: "400",
    inAnimationDuration: 400,
    inAnimationDelay: 200,
    inAnimationEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    outAnimationDuration: 300,
    outAnimationDelay: 0,
    outAnimationEasing: "cubic-bezier(0.6, 0, 0.4, 1)",
  },
  blockBackground: {
    type: "background",
    inAnimationDuration: 500,
    inAnimationDelay: -50,
    inAnimationEasing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    outAnimationDuration: 300,
    outAnimationDelay: 0,
    outAnimationEasing: "cubic-bezier(0.6, 0, 0.4, 1)",
  },
};

const DEFAULT_STATE = {
  mainTitle: "",
  mainTitleColor: "#FFFFFF",
  subtitle: "",
  subtitleColor: "#FFFFFF",
  tertiaryText: "",
  tertiaryColor: "#FFFFFF",
  accentColor: "#00D4FF",
  backgroundColor: "#0A0E27",
};

const TEMPLATE = `
  <style>
    :host {
      position: absolute;
      inset: 0;
      display: block;
      pointer-events: none;
      font-family: "Inter", "Segoe UI", sans-serif;
      --accent-color: #00D4FF;
      --background-color: #0A0E27;
    }

    .scene {
      position: absolute;
      left: max(5vw, 60px);
      bottom: calc(max(6vh, 72px) + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: 0;
      opacity: 0;
      will-change: transform, opacity;
    }

    .accent-left {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--accent-color);
      opacity: 0;
      will-change: opacity, transform;
      z-index: 5;
    }

    .accent-top {
      position: absolute;
      top: 0;
      left: 3px;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--accent-color) 0%, transparent 100%);
      opacity: 0;
      will-change: opacity, transform;
      z-index: 10;
    }

    .blocks-container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0;
      border-radius: 4px;
      overflow: hidden;
    }

    .block {
      opacity: 0;
      will-change: opacity, transform;
      transform: translate3d(0, 0, 0);
      line-height: 1.2;
      background: var(--background-color);
      border-radius: 0;
      position: relative;
    }

    .block-1 {
      font-size: 56px;
      font-weight: 700;
      padding: 12px 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      background: var(--background-color);
      border-bottom: 4px solid transparent;
      background-image: linear-gradient(var(--background-color), var(--background-color)),
                        linear-gradient(90deg, var(--accent-color) 0%, transparent 100%);
      background-origin: border-box;
      background-clip: padding-box, border-box;
    }

    .block-2 {
      font-size: 40px;
      font-weight: 400;
      padding: 8px 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      background: var(--background-color);
      position: relative;
    }

    .block-2::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--accent-color);
      opacity: 0;
      will-change: opacity;
    }

    @media (prefers-reduced-motion: reduce) {
      .scene,
      .block,
      .accent-top,
      .accent-left {
        transition: none;
        animation: none;
      }
    }
  </style>

  <div class="scene">
    <div class="accent-left"></div>
    <div class="accent-top"></div>
    <div class="blocks-container">
      <div class="block block-1"></div>
      <div class="block block-2"></div>
    </div>
  </div>
`;

class ModularLowerThirdComponent extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._blockAnimations = {};
    this._elements = {};

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = TEMPLATE;

    this._elements.scene = root.querySelector(".scene");
    this._elements.blocksContainer = root.querySelector(".blocks-container");
    this._elements.accentLeft = root.querySelector(".accent-left");
    this._elements.accentTop = root.querySelector(".accent-top");
    this._elements.blocks = {
      block1: root.querySelector(".block-1"),
      block2: root.querySelector(".block-2"),
    };

    // Initialize block animations map
    ["block1", "block2", "accentLeft", "accentTop", "block2Accent"].forEach((key) => {
      this._blockAnimations[key] = null;
    });
  }

  async load(params) {
    if (params?.renderType !== "realtime") {
      return { statusCode: 400, statusMessage: "Non-realtime not supported" };
    }

    this._state = { ...DEFAULT_STATE, ...(params?.data || {}) };
    this._applyState();

    // Preload fonts
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load("700 56px Inter"),
        document.fonts.load("500 40px Inter"),
        document.fonts.load("400 28px Inter"),
      ]).catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async playAction(params) {
    const targetStep = this._resolveTargetStep(params);
    const skipAnimation = params?.skipAnimation === true;

    if (targetStep === undefined) {
      this._currentStep = undefined;
    } else {
      await this._animateBlocks(true, skipAnimation);
      this._currentStep = targetStep;
    }

    return { statusCode: 200, currentStep: this._currentStep };
  }

  async stopAction(params) {
    await this._animateBlocks(false, params?.skipAnimation === true);
    this._currentStep = undefined;
    return { statusCode: 200 };
  }

  async updateAction(params) {
    this._state = { ...this._state, ...(params?.data || {}) };
    this._applyState();
    return { statusCode: 200 };
  }

  async customAction(params) {
    return { statusCode: 200 };
  }

  async dispose() {
    this._cancelAllAnimations();
    if (this._elements.scene) {
      this._elements.scene.remove();
    }
    this.shadowRoot.innerHTML = "";
    return { statusCode: 200 };
  }

  _applyState() {
    const { mainTitle, subtitle, accentColor, backgroundColor } = this._state;

    // Update text blocks
    this._elements.blocks.block1.textContent = mainTitle || "";
    this._elements.blocks.block2.textContent = subtitle || "";

    // Update block visibility based on content
    this._elements.blocks.block1.style.display = mainTitle ? "block" : "none";
    this._elements.blocks.block2.style.display = subtitle ? "block" : "none";

    // Apply colors via CSS custom properties
    this.style.setProperty(
      "--accent-color",
      this._sanitizeColor(accentColor)
    );
    this.style.setProperty(
      "--background-color",
      this._sanitizeColor(backgroundColor)
    );

    // Apply text-specific colors
    if (this._state.mainTitleColor) {
      this._elements.blocks.block1.style.color = this._sanitizeColor(
        this._state.mainTitleColor
      );
    }
    if (this._state.subtitleColor) {
      this._elements.blocks.block2.style.color = this._sanitizeColor(
        this._state.subtitleColor
      );
    }
  }

  async _animateBlocks(visible, skipAnimation) {
    if (this._isVisible === visible) return Promise.resolve();

    this._isVisible = visible;
    this._cancelAllAnimations();

    if (skipAnimation) {
      this._setBlocksState(visible);
      return Promise.resolve();
    }

    const animations = [];

    // Animate scene container
    const sceneAnim = this._elements.scene.animate(
      visible
        ? [
            { opacity: 0, transform: "translate3d(0, 20px, 0)" },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ]
        : [
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
            { opacity: 0, transform: "translate3d(0, 20px, 0)" },
          ],
      {
        duration: visible ? 700 : 300,
        easing: visible
          ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          : "cubic-bezier(0.6, 0, 0.4, 1)",
        fill: "forwards",
      }
    );
    animations.push(sceneAnim);

    // Animate left accent bar (slides down)
    const accentLeftAnim = this._elements.accentLeft.animate(
      visible
        ? [
            { opacity: 0, transform: "translateY(-100%)" },
            { opacity: 1, transform: "translateY(0)" },
          ]
        : [
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(-100%)" },
          ],
      {
        duration: visible ? 500 : 250,
        delay: visible ? -50 : 0,
        easing: visible
          ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          : "cubic-bezier(0.6, 0, 0.4, 1)",
        fill: "forwards",
      }
    );
    animations.push(accentLeftAnim);

    // Animate top accent reveal bar (expands)
    const accentTopAnim = this._elements.accentTop.animate(
      visible
        ? [
            { opacity: 0, transform: "scaleX(0)" },
            { opacity: 1, transform: "scaleX(1)" },
          ]
        : [
            { opacity: 1, transform: "scaleX(1)" },
            { opacity: 0, transform: "scaleX(0)" },
          ],
      {
        duration: visible ? 400 : 200,
        delay: visible ? 100 : 0,
        easing: visible
          ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          : "cubic-bezier(0.6, 0, 0.4, 1)",
        fill: "forwards",
      }
    );
    animations.push(accentTopAnim);

    // Animate text/content blocks with individual characteristics
    ["block1", "block2"].forEach((blockKey) => {
      const blockEl = this._elements.blocks[blockKey];
      if (blockEl && blockEl.style.display !== "none") {
        const anim = this._animateBlockIndividual(blockKey, blockEl, visible);
        if (anim) animations.push(anim);
      }
    });

    // Wait for all animations to finish
    if (animations.length === 0) return Promise.resolve();

    return Promise.all(animations.map((anim) => anim.finished))
      .catch(() => undefined)
      .finally(() => {
        this._setBlocksState(visible);
      });
  }

  _animateBlock2Accent(visible) {
    // Animate the left accent stripe on block2
    const block2El = this._elements.blocks.block2;
    if (!block2El) return null;

    const animation = block2El.animate(
      visible
        ? [{ opacity: 0.3 }, { opacity: 1 }]
        : [{ opacity: 1 }, { opacity: 0.3 }],
      {
        duration: visible ? 500 : 250,
        delay: visible ? 150 : 0,
        easing: visible
          ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          : "cubic-bezier(0.6, 0, 0.4, 1)",
        fill: "forwards",
      }
    );

    this._blockAnimations.block2Accent = animation;
    return animation;
  }

  _animateBlockIndividual(blockKey, element, visible) {
    if (!element) return null;

    const config = BLOCK_CONFIG[blockKey];
    if (!config) return null;

    const duration = visible
      ? config.inAnimationDuration
      : config.outAnimationDuration;
    const delay = visible ? config.inAnimationDelay : config.outAnimationDelay;
    const easing = visible
      ? config.inAnimationEasing
      : config.outAnimationEasing;

    // Define individual block animations with distinct directions and transforms
    let keyframes;
    if (blockKey === "block1") {
      // Block1: Slide from left with scale
      keyframes = visible
        ? [
            { opacity: 0, transform: "translate3d(-40px, 0, 0) scale(0.9)" },
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          ]
        : [
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
            { opacity: 0, transform: "translate3d(-40px, 0, 0) scale(0.9)" },
          ];
    } else if (blockKey === "block2") {
      // Block2: Slide from right with scale
      keyframes = visible
        ? [
            { opacity: 0, transform: "translate3d(40px, 0, 0) scale(0.9)" },
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          ]
        : [
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
            { opacity: 0, transform: "translate3d(40px, 0, 0) scale(0.9)" },
          ];
    } else {
      // Fallback
      keyframes = visible
        ? [
            { opacity: 0, transform: "translate3d(0, 12px, 0) scale(0.98)" },
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          ]
        : [
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
            { opacity: 0, transform: "translate3d(0, 12px, 0) scale(0.98)" },
          ];
    }

    const animation = element.animate(keyframes, {
      duration,
      delay,
      easing,
      fill: "forwards",
    });

    this._blockAnimations[blockKey] = animation;

    return animation;
  }

  _setBlocksState(visible) {
    const opacity = visible ? "1" : "0";
    const transform = visible ? "translate3d(0, 0, 0) scale(1)" : "translate3d(0, 12px, 0) scale(0.98)";

    // Set scene container visibility
    this._elements.scene.style.opacity = opacity;

    // Set accent elements
    this._elements.accentLeft.style.opacity = opacity;
    this._elements.accentLeft.style.transform = "translateY(0)";
    this._elements.accentTop.style.opacity = opacity;
    this._elements.accentTop.style.transform = "scaleX(1)";

    ["block1", "block2"].forEach((blockKey) => {
      const blockEl = this._elements.blocks[blockKey];
      if (blockEl && blockEl.style.display !== "none") {
        blockEl.style.opacity = opacity;
        blockEl.style.transform = transform;
      }
    });
  }

  _cancelAllAnimations() {
    Object.values(this._blockAnimations).forEach((anim) => {
      if (anim && typeof anim.cancel === "function") {
        anim.cancel();
      }
    });
    this._blockAnimations = {};
    ["block1", "block2", "accentLeft", "accentTop", "block2Accent"].forEach((key) => {
      this._blockAnimations[key] = null;
    });
  }

  _resolveTargetStep(params) {
    const stepCount = 1;
    const goto = params?.goto;
    const delta = typeof params?.delta === "number" ? params.delta : 1;

    if (typeof goto === "number") {
      return goto >= stepCount ? undefined : Math.max(0, goto);
    }

    const current =
      typeof this._currentStep === "number" ? this._currentStep : -1;
    const target = current + delta;

    if (target >= stepCount) {
      return undefined;
    }

    return Math.max(0, target);
  }

  _sanitizeColor(color) {
    if (typeof color !== "string") return "#FFFFFF";
    const hexMatch = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    return hexMatch ? color.trim() : "#FFFFFF";
  }
}



export default ModularLowerThirdComponent;
