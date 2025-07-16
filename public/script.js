/* eslint-disable @typescript-eslint/no-unused-vars */
// Use global THREE and dat.GUI from CDN
const THREE = window.THREE;
const GUI = window.dat.GUI;

// Initialize locomotive scroll when DOM is ready
function initLocomotiveScroll() {
  const masterElement = document.querySelector('#master');
  if (masterElement) {
    var scroll = new LocomotiveScroll({
      el: masterElement,
      smooth: true
    });
  } else {
    setTimeout(initLocomotiveScroll, 100);
  }
}

// Scene setup
let scene, camera, renderer;
let shaderMaterial;
let time = 0;
let frameCount = 0;
let lastTime = performance.now();
let fpsElement;
let gui;

// Audio variables
let audioContext, analyser, dataArray;
let audioElement;
let lowFreq = 0,
  midFreq = 0,
  highFreq = 0;
let prevLowFreq = 0;
let playing = false;
let audioSource;

// Multi-band kick detection for better accuracy
let kickDetected = false;
let kickEnergy = 0;
let kickDecay = 0.8;
let kickThreshold = 0.05; // Lower threshold to catch more kicks
let kickSensitivity = 2.0;
let kickImpactDuration = 0;
let energyHistory = [];
const historyLength = 4; // Shorter history for faster response

// Create frequency band energy arrays for multi-band detection
let bandEnergies = Array(8).fill(0);
let bandHistories = Array(8)
  .fill()
  .map(() => []);

// Beat tracking variables
let beatTime = 0;
let lastKickTime = 0;
let beatInterval = 0;
let beatPhase = 0;

// Transition variables for smooth animation
let transitionFactor = 0; // 0 = not playing, 1 = playing
const transitionSpeed = 0.03; // Slower transition for more smoothness
let idleAnimation = 0; // Animation value when idle

// Mouse position
const mouse = {
  x: 0.5,
  y: 0.5
};

// Settings for dat.gui
const settings = {
  // Animation settings
  baseSpeed: 1.0,
  idleSpeed: 0.1,

  // Audio reactivity
  bassReactivity: 0.4, // More moderate
  midReactivity: 0.5,
  highReactivity: 0.4,

  // Kick settings - more subtle defaults
  kickReactivity: 0.6, // Reduced from 1.0
  bounceIntensity: 0.15, // More subtle bounce
  waveIntensity: 0.08,
  waveComplexity: 2.2,
  rippleIntensity: 0.25, // Reduced from 0.5

  // Visual settings
  lineThickness: 1.8,
  lineStraightness: 2.53,

  // Transition settings
  idleWaveHeight: 0.01, // Small waves when idle
  transitionSmoothness: 0.03, // How smooth the transition is

  // Color settings
  colorPreset: "Warm",
  // bgColorDown: [40, 20, 10],
  // bgColorUp: [20, 10, 5],
  // color1In: [255, 200, 0],
  // color1Out: [255, 100, 0],
  // color2In: [255, 100, 100],
  // color2Out: [200, 50, 50],
  // color3In: [255, 150, 50],
  // color3Out: [200, 100, 0],
  bgColorDown: [64, 34, 145],
  bgColorUp: [0, 0, 0],
  color1In: [76, 58, 201],
  color1Out: [141, 151, 230],
  color2In: [238, 238, 255],
  color2Out: [50, 11, 255],
  color3In: [127, 0, 255],
  color3Out: [90, 90, 207],


  // Grain settings
  enableGrain: true,
  grainIntensity: 0.075,
  grainSpeed: 2.0,
  grainMean: 0.0,
  grainVariance: 0.5,
  grainBlendMode: "Addition",

  // Advanced settings
  showGui: true,
  showDebug: false,

  // Reset to defaults
  resetColors: () => {
    applyColorPreset(settings.colorPreset);
  }
};

// Color presets
const colorPresets = {
  Default: {
    bgColorDown: [51, 25, 25],
    bgColorUp: [25, 25, 51],
    color1In: [255, 128, 0],
    color1Out: [255, 0, 0],
    color2In: [0, 128, 255],
    color2Out: [0, 0, 255],
    color3In: [0, 255, 128],
    color3Out: [0, 200, 100]
  },
  Neon: {
    bgColorDown: [10, 10, 20],
    bgColorUp: [5, 5, 15],
    color1In: [255, 0, 255], // Magenta
    color1Out: [128, 0, 255], // Purple
    color2In: [0, 255, 255], // Cyan
    color2Out: [0, 128, 255], // Blue
    color3In: [255, 255, 0], // Yellow
    color3Out: [255, 128, 0] // Orange
  },
  Warm: {
    bgColorDown: [64, 34, 145],
    bgColorUp: [0, 0, 0],
    color1In: [76, 58, 201],
    color1Out: [141, 151, 230],
    color2In: [238, 238, 255],
    color2Out: [50, 11, 255],
    color3In: [127, 0, 255],
    color3Out: [90, 90, 207],
  },
  Cool: {
    bgColorDown: [10, 20, 30],
    bgColorUp: [5, 10, 20],
    color1In: [100, 200, 255], // Light Blue
    color1Out: [0, 100, 200], // Dark Blue
    color2In: [100, 255, 200], // Mint
    color2Out: [0, 150, 100], // Green
    color3In: [150, 200, 255], // Sky Blue
    color3Out: [50, 100, 200] // Royal Blue
  },
  Monochrome: {
    bgColorDown: [10, 10, 10],
    bgColorUp: [20, 20, 20],
    color1In: [200, 200, 200], // Light Gray
    color1Out: [150, 150, 150], // Mid Gray
    color2In: [255, 255, 255], // White
    color2Out: [100, 100, 100], // Dark Gray
    color3In: [180, 180, 180], // Silver
    color3Out: [120, 120, 120] // Gray
  },
  Cyberpunk: {
    bgColorDown: [20, 0, 40],
    bgColorUp: [0, 20, 40],
    color1In: [255, 0, 128], // Hot Pink
    color1Out: [200, 0, 100], // Dark Pink
    color2In: [0, 255, 128], // Neon Green
    color2Out: [0, 200, 100], // Dark Green
    color3In: [255, 255, 0], // Neon Yellow
    color3Out: [200, 200, 0] // Dark Yellow
  }
};

// Apply color preset
function applyColorPreset(presetName) {
  if (colorPresets[presetName]) {
    const preset = colorPresets[presetName];

    // Copy preset values to settings
    settings.bgColorDown = [...preset.bgColorDown];
    settings.bgColorUp = [...preset.bgColorUp];
    settings.color1In = [...preset.color1In];
    settings.color1Out = [...preset.color1Out];
    settings.color2In = [...preset.color2In];
    settings.color2Out = [...preset.color2Out];
    settings.color3In = [...preset.color3In];
    settings.color3Out = [...preset.color3Out];

    // Update shader uniforms with new colors
    updateShaderColors();

    // Update GUI controllers if GUI exists
    if (gui && gui.__controllers) {
      for (let i = 0; i < gui.__controllers.length; i++) {
        const controller = gui.__controllers[i];
        if (
          controller.property === "bgColorDown" ||
          controller.property === "bgColorUp" ||
          controller.property === "color1In" ||
          controller.property === "color1Out" ||
          controller.property === "color2In" ||
          controller.property === "color2Out" ||
          controller.property === "color3In" ||
          controller.property === "color3Out"
        ) {
          controller.updateDisplay();
        }
      }
    }
  }
}

// Update shader colors
function updateShaderColors() {
  if (!shaderMaterial) return;

  shaderMaterial.uniforms.bgColorDown.value.set(
    settings.bgColorDown[0] / 255,
    settings.bgColorDown[1] / 255,
    settings.bgColorDown[2] / 255
  );

  shaderMaterial.uniforms.bgColorUp.value.set(
    settings.bgColorUp[0] / 255,
    settings.bgColorUp[1] / 255,
    settings.bgColorUp[2] / 255
  );

  shaderMaterial.uniforms.color1In.value.set(
    settings.color1In[0] / 255,
    settings.color1In[1] / 255,
    settings.color1In[2] / 255
  );

  shaderMaterial.uniforms.color1Out.value.set(
    settings.color1Out[0] / 255,
    settings.color1Out[1] / 255,
    settings.color1Out[2] / 255
  );

  shaderMaterial.uniforms.color2In.value.set(
    settings.color2In[0] / 255,
    settings.color2In[1] / 255,
    settings.color2In[2] / 255
  );

  shaderMaterial.uniforms.color2Out.value.set(
    settings.color2Out[0] / 255,
    settings.color2Out[1] / 255,
    settings.color2Out[2] / 255
  );

  shaderMaterial.uniforms.color3In.value.set(
    settings.color3In[0] / 255,
    settings.color3In[1] / 255,
    settings.color3In[2] / 255
  );

  shaderMaterial.uniforms.color3Out.value.set(
    settings.color3Out[0] / 255,
    settings.color3Out[1] / 255,
    settings.color3Out[2] / 255
  );
}

// Custom cursor implementation with throttling for better performance
const cursor = document.querySelector(".custom-cursor");
let lastCursorUpdate = 0;

if (cursor) {
  document.addEventListener("mousemove", (e) => {
    // Update mouse position for shader
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;

    // Throttle cursor updates to every 16ms (approx 60fps)
    const now = performance.now();
    if (now - lastCursorUpdate > 16) {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      lastCursorUpdate = now;
    }
  });
}

// Vertex shader source
const vertexShaderSource = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment shader source with enhanced transitions and more subtle effects
const fragmentShaderSource = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform float lowFreq;
uniform float midFreq;
uniform float highFreq;
uniform bool isPlaying;
uniform float transitionFactor;
uniform float lineStraightness;
uniform float idleAnimation;
uniform float idleWaveHeight;

// Enhanced kick/beat detection
uniform float kickEnergy;
uniform float beatPhase;
uniform float bounceEffect;

// Settings uniforms
uniform float baseSpeed;
uniform float idleSpeed;
uniform float bassReactivity;
uniform float midReactivity;
uniform float highReactivity;
uniform float kickReactivity;
uniform float bounceIntensity;
uniform float waveIntensity;
uniform float waveComplexity;
uniform float rippleIntensity;
uniform float lineThickness;

// Grain uniforms
uniform bool enableGrain;
uniform float grainIntensity;
uniform float grainSpeed;
uniform float grainMean;
uniform float grainVariance;
uniform int grainBlendMode;

// Color uniforms
uniform vec3 bgColorDown;
uniform vec3 bgColorUp;
uniform vec3 color1In;
uniform vec3 color1Out;
uniform vec3 color2In;
uniform vec3 color2Out;
uniform vec3 color3In;
uniform vec3 color3Out;

varying vec2 vUv;

// Helper function to square a value
float squared(float value) {
  return value * value;
}

// Helper function for smoother step
float smootherstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Grain functions
vec3 channel_mix(vec3 a, vec3 b, vec3 w) {
  return vec3(mix(a.r, b.r, w.r), mix(a.g, b.g, w.g), mix(a.b, b.b, w.b));
}

float gaussian(float z, float u, float o) {
  return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
}

vec3 screen(vec3 a, vec3 b, float w) {
  return mix(a, vec3(1.0) - (vec3(1.0) - a) * (vec3(1.0) - b), w);
}

vec3 overlay(vec3 a, vec3 b, float w) {
  return mix(a, channel_mix(
    2.0 * a * b,
    vec3(1.0) - 2.0 * (vec3(1.0) - a) * (vec3(1.0) - b),
    step(vec3(0.5), a)
  ), w);
}

vec3 soft_light(vec3 a, vec3 b, float w) {
  return mix(a, pow(a, pow(vec3(2.0), 2.0 * (vec3(0.5) - b))), w);
}

// Apply grain to the color
vec3 applyGrain(vec3 color, vec2 uv) {
  if (!enableGrain) return color;
  
  float t = iTime * grainSpeed;
  float seed = dot(uv, vec2(12.9898, 78.233));
  float noise = fract(sin(seed) * 43758.5453 + t);
  noise = gaussian(noise, grainMean, grainVariance * grainVariance);
  
  vec3 grain = vec3(noise) * (1.0 - color);
  
  if (grainBlendMode == 0) {
    // Addition
    color += grain * grainIntensity;
  } else if (grainBlendMode == 1) {
    // Screen
    color = screen(color, grain, grainIntensity);
  } else if (grainBlendMode == 2) {
    // Overlay
    color = overlay(color, grain, grainIntensity);
  } else if (grainBlendMode == 3) {
    // Soft Light
    color = soft_light(color, grain, grainIntensity);
  } else if (grainBlendMode == 4) {
    // Lighten-Only
    color = max(color, grain * grainIntensity);
  }
  
  return color;
}

// Circular ripple effect for kicks - more subtle
float kickRipple(vec2 uv, float energy, float time) {
  float dist = distance(uv, vec2(0.5, 0.5));
  float width = 0.05; // Ripple width
  float speed = 1.2;  // Ripple expansion speed
  
  // Multiple ripples with different phases
  float ripple1 = smootherstep(energy * speed * time - width, energy * speed * time, dist);
  ripple1 *= smootherstep(dist, dist + width, energy * speed * time + width);
  
  float ripple2 = smootherstep(energy * speed * (time - 0.2) - width, energy * speed * (time - 0.2), dist);
  ripple2 *= smootherstep(dist, dist + width, energy * speed * (time - 0.2) + width);
  
  return (ripple1 + ripple2 * 0.5) * energy * 0.7; // More subtle
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Coords
  vec2 p = fragCoord.xy / iResolution.xy;
  
  // Background
  vec3 bgCol = mix(bgColorDown, bgColorUp, clamp(p.y * 2.0, 0.0, 1.0));
  
  // IMPROVED TRANSITION: Blend between idle and playing states
  // Base movement speed - smooth transition between playing and idle
  float speed = mix(idleSpeed, baseSpeed, transitionFactor);
  
  // Ball visibility - smooth transition
  float ballVisibility = mix(0.8, 0.2, transitionFactor);
  
  // Calculate straightness factor - higher value = straighter lines when music is playing
  float straightnessFactor = mix(1.0, lineStraightness, transitionFactor);
  
  // IDLE ANIMATION: Create gentle wave motion when music is not playing
  float idleWave = idleWaveHeight * sin(p.x * 5.0 + idleAnimation * 0.2);
  
  // Use squared function for more impact but with moderation
  float bassPulse = squared(lowFreq) * bassReactivity * transitionFactor;
  float midPulse = squared(midFreq) * midReactivity * transitionFactor;
  float highPulse = squared(highFreq) * highReactivity * transitionFactor;
  
  // More moderate kick response
  float kickPulse = squared(kickEnergy) * kickReactivity * 1.5 * transitionFactor; 
  
  // Global vertical bounce effect on kicks - more subtle
  float bounce = bounceEffect * bounceIntensity * transitionFactor;
  
  // Add audio reactivity to the curve - acts like an audio wave
  // IMPROVED TRANSITION: Blend between idle wave and audio reactive wave
  float curveIntensity = mix(idleWaveHeight, 0.05 + waveIntensity * (bassPulse + kickPulse * 0.7), transitionFactor);
  float curveSpeed = speed;
  
  // Main curve that acts like an audio wave
  float curve = curveIntensity * sin((6.25 * p.x) + (curveSpeed * iTime));
  
  // Add kick ripple effect - more subtle
  float ripple = rippleIntensity * kickRipple(p, kickEnergy, mod(iTime, 10.0)) * transitionFactor;
  
  // IMPROVED TRANSITION: Audio wave intensity tied to transition factor
  float audioWave = mix(
    0.0, // No distortion when idle
    (0.1 * sin(p.x * 20.0 * waveComplexity) * bassPulse + 
     0.08 * sin(p.x * 30.0 * waveComplexity) * midPulse + 
     0.05 * sin(p.x * 50.0 * waveComplexity) * highPulse) / straightnessFactor,
    transitionFactor
  );
  
  // Line A (Bass/Kick) - dedicated to kick visualization
  float lineAFreq = 40.0 * waveComplexity + 80.0 * bassPulse + 90.0 * kickPulse;
  float lineASpeed = 1.5 * speed + 6.0 * bassPulse + 6.0 * kickPulse;
  
  // IMPROVED TRANSITION: Blend between idle and reactive wave
  float lineAWave = mix(
    idleWave,
    (0.01 + 0.05 * bassPulse + 0.1 * kickPulse) / straightnessFactor,
    transitionFactor
  );
  
  // More subtle kick wave effect
  float kickWaveEffect = 0.0;
  if (kickEnergy > 0.1) {
    // Create a traveling wave distortion when kick hits - more subtle
    kickWaveEffect = kickEnergy * 0.3 * sin(15.0 * (p.x - iTime * 0.5)) * transitionFactor;
  }
  
  // Apply bass effect with moderation
  float lineAOffset = bassPulse * 0.3 * sin(p.x * 10.0 - iTime * 2.0) + kickWaveEffect * 0.7;
  
  // IMPROVED TRANSITION: Blend idle position with reactive position
  float lineAY = 0.5; // Center position
  float lineAActive = lineAY + curve + audioWave + lineAWave * sin((lineAFreq * p.x) + (-lineASpeed * iTime)) + lineAOffset - bounce;
  float lineAIdle = lineAY + idleWave;
  
  // Blend between idle and active positions
  float lineAAnim = mix(lineAIdle, lineAActive, transitionFactor);
  
  // Adjust line thickness with kick energy - more moderate
  float lineAThickness = lineThickness * (1.0 + bassPulse * 0.4 + kickPulse * 0.8);
  float lineADist = distance(p.y, lineAAnim) * (2.0 / lineAThickness);
  float lineAShape = smootherstep(1.0 - clamp(lineADist, 0.0, 1.0), 1.0, 0.99);
  
  // More subtle color enhancement
  vec3 kickColor = vec3(1.0, 0.7, 0.3); // Bright orange-yellow
  vec3 enhancedColor1In = mix(color1In, kickColor, kickEnergy * 0.6 * transitionFactor);
  vec3 enhancedColor1Out = mix(color1Out, vec3(1.0, 0.5, 0.0), kickEnergy * 0.4 * transitionFactor);
  vec3 lineACol = (1.0 - lineAShape) * vec3(mix(enhancedColor1In, enhancedColor1Out, lineAShape));
  
  // Ball A - follows line A exactly - more moderate growth on kicks
  float ballASize = 0.5 + 0.4 * bassPulse + kickEnergy * 1.2 * transitionFactor;
  float ballAX = 0.2 + 0.1 * sin(iTime * 0.2 * speed) * midPulse;
  float ballADist = distance(p, vec2(ballAX, lineAAnim));
  float ballAShape = smootherstep(1.0 - clamp(ballADist * ballASize, 0.0, 1.0), 1.0, 0.99);
  vec3 ballACol = (1.0 - ballAShape) * vec3(mix(enhancedColor1In, enhancedColor1Out, ballAShape)) * mix(1.0, ballVisibility, transitionFactor);
  
  // Line B (Mid) - reacts to mid frequencies and slightly to kicks
  float lineBFreq = 50.0 * waveComplexity + 100.0 * midPulse;
  float lineBSpeed = 2.0 * speed + 8.0 * midPulse;
  
  // IMPROVED TRANSITION: Blend between idle and reactive wave
  float lineBWave = mix(
    idleWave * 0.8, // Slightly different idle wave
    (0.01 + 0.05 * midPulse) / straightnessFactor,
    transitionFactor
  );
  
  // Apply mid-frequency effect with minimal kick influence
  float lineBOffset = midPulse * 0.2 * sin(p.x * 15.0 - iTime * 1.5) + kickEnergy * 0.1 * sin(p.x * 25.0 - iTime * 3.0) * transitionFactor;
  
  // IMPROVED TRANSITION: Blend idle position with reactive position
  float lineBY = 0.5; // Center position
  float lineBActive = lineBY + curve - audioWave + lineBWave * sin((lineBFreq * p.x) + (lineBSpeed * iTime)) * sin(lineBSpeed * iTime) + lineBOffset - bounce * 0.5;
  float lineBIdle = lineBY + idleWave * 0.8;
  
  // Blend between idle and active positions
  float lineBAnim = mix(lineBIdle, lineBActive, transitionFactor);
  
  // Adjust line thickness with mid response and minimal kick influence
  float lineBThickness = lineThickness * (1.0 + midPulse * 0.3 + kickEnergy * 0.3 * transitionFactor);
  float lineBDist = distance(p.y, lineBAnim) * (2.0 / lineBThickness);
  float lineBShape = smootherstep(1.0 - clamp(lineBDist, 0.0, 1.0), 1.0, 0.99);
  
  // Slightly enhance mid colors with kick
  vec3 enhancedColor2In = mix(color2In, vec3(1.0, 0.5, 0.5), kickEnergy * 0.3 * transitionFactor);
  vec3 lineBCol = (1.0 - lineBShape) * vec3(mix(enhancedColor2In, color2Out, lineBShape));
  
  // Ball B - follows line B exactly with minimal kick influence
  float ballBSize = 0.5 + 0.4 * highPulse + kickEnergy * 0.3 * transitionFactor;
  float ballBX = 0.8 - 0.1 * sin(iTime * 0.3 * speed) * midPulse;
  float ballBDist = distance(p, vec2(ballBX, lineBAnim));
  float ballBShape = smootherstep(1.0 - clamp(ballBDist * ballBSize, 0.0, 1.0), 1.0, 0.99);
  vec3 ballBCol = (1.0 - ballBShape) * vec3(mix(enhancedColor2In, color2Out, ballBShape)) * mix(1.0, ballVisibility, transitionFactor);
  
  // Line C (High) - minimal kick influence
  float lineCFreq = 60.0 * waveComplexity + 120.0 * highPulse;
  float lineCSpeed = 2.5 * speed + 10.0 * highPulse;
  
  // IMPROVED TRANSITION: Blend between idle and reactive wave
  float lineCWave = mix(
    idleWave * 1.2, // Different idle wave
    (0.01 + 0.05 * highPulse) / straightnessFactor,
    transitionFactor
  );
  
  // Apply high-frequency effect with minimal kick influence
  float lineCOffset = highPulse * 0.15 * sin(p.x * 20.0 - iTime * 1.0);
  
  // IMPROVED TRANSITION: Blend idle position with reactive position
  float lineCY = 0.5; // Center position
  float lineCActive = lineCY + curve * 0.7 - audioWave * 0.5 + lineCWave * sin((lineCFreq * p.x) + (lineCSpeed * iTime)) * sin(lineCSpeed * (iTime + 0.1)) + lineCOffset - bounce * 0.3;
  float lineCIdle = lineCY + idleWave * 1.2;
  
  // Blend between idle and active positions
  float lineCAnim = mix(lineCIdle, lineCActive, transitionFactor);
  
  // Adjust line thickness with high response and minimal kick influence
  float lineCThickness = lineThickness * (1.0 + highPulse * 0.2 + kickEnergy * 0.1 * transitionFactor);
  float lineCDist = distance(p.y, lineCAnim) * (2.0 / lineCThickness);
  float lineCShape = smootherstep(1.0 - clamp(lineCDist, 0.0, 1.0), 1.0, 0.99);
  vec3 lineCCol = (1.0 - lineCShape) * vec3(mix(color3In, color3Out, lineCShape));
  
  // Ball C - follows line C exactly with minimal kick influence
  float ballCSize = 0.5 + 0.4 * highPulse + kickEnergy * 0.1 * transitionFactor;
  float ballCX = 0.5 + 0.15 * sin(iTime * 0.4 * speed) * highPulse;
  float ballCDist = distance(p, vec2(ballCX, lineCAnim));
  float ballCShape = smootherstep(1.0 - clamp(ballCDist * ballCSize, 0.0, 1.0), 1.0, 0.99);
  vec3 ballCCol = (1.0 - ballCShape) * vec3(mix(color3In, color3Out, ballCShape)) * mix(1.0, ballVisibility, transitionFactor);
  
  // Add subtle kick flash to background
  bgCol = mix(bgCol, mix(bgCol, vec3(1.0), 0.2), kickEnergy * 0.4 * transitionFactor);
  
  // Add ripple effect - more subtle
  vec3 rippleCol = vec3(1.0, 0.8, 0.4) * ripple * transitionFactor;
  
  // Final color
  vec3 fcolor = bgCol + lineACol + lineBCol + lineCCol + ballACol + ballBCol + ballCCol + rippleCol;
  
  // Apply grain effect
  fcolor = applyGrain(fcolor, p);
  
  fragColor = vec4(fcolor, 1.0);
}

void main() {
  vec2 fragCoord = vUv * iResolution;
  vec4 fragColor;
  mainImage(fragColor, fragCoord);
  gl_FragColor = fragColor;
}
`;

// Function to create debug display
function createDebugDisplay() {
  if (document.getElementById("debugDisplay")) return;

  const debugDiv = document.createElement("div");
  debugDiv.id = "debugDisplay";
  debugDiv.style.position = "fixed";
  debugDiv.style.top = "10px";
  debugDiv.style.left = "10px";
  debugDiv.style.backgroundColor = "rgba(0,0,0,0.7)";
  debugDiv.style.color = "white";
  debugDiv.style.padding = "10px";
  debugDiv.style.borderRadius = "5px";
  debugDiv.style.fontFamily = "monospace";
  debugDiv.style.fontSize = "12px";
  debugDiv.style.zIndex = "1000";
  debugDiv.style.display = settings.showDebug ? "block" : "none";

  document.body.appendChild(debugDiv);
}

// Function to update debug display
function updateDebugDisplay() {
  const debugDiv = document.getElementById("debugDisplay");
  if (!debugDiv) return;

  debugDiv.style.display = settings.showDebug ? "block" : "none";
  if (!settings.showDebug) return;

  const kickInfo = kickDetected ? `YES (${kickEnergy.toFixed(2)})` : "no";

  debugDiv.innerHTML = `
    <div>Transition: ${transitionFactor.toFixed(2)}</div>
    <div>Kick: ${kickInfo}</div>
    <div>Bass: ${lowFreq.toFixed(2)}</div>
    <div>Mid: ${midFreq.toFixed(2)}</div>
    <div>High: ${highFreq.toFixed(2)}</div>
    <div>Beat Phase: ${beatPhase.toFixed(2)}</div>
    <div>Bounce: ${
      shaderMaterial?.uniforms.bounceEffect.value.toFixed(3) || 0
    }</div>
    <div>Bands: [${bandEnergies.map((v) => v.toFixed(1)).join(", ")}]</div>
  `;
}

// Initialize Three.js scene
function init() {
  // Get DOM elements
  const container = document.getElementById("container");
  fpsElement = document.getElementById("fps");

  // Check if required elements exist
  if (!container) {
    console.log("Container not found, retrying in 100ms...");
    setTimeout(init, 100);
    return;
  }

  // Initialize locomotive scroll
  initLocomotiveScroll();

  // Create debug display
  createDebugDisplay();

  // Create scene
  scene = new THREE.Scene();

  // Create camera
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  camera.position.z = 1;

  // Create renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Create shader material
  shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    uniforms: {
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight)
      },
      iTime: {
        value: 0
      },
      iMouse: {
        value: new THREE.Vector2(0.5, 0.5)
      },
      lowFreq: {
        value: 0
      },
      midFreq: {
        value: 0
      },
      highFreq: {
        value: 0
      },
      isPlaying: {
        value: false
      },
      transitionFactor: {
        value: 0
      },
      lineStraightness: {
        value: settings.lineStraightness
      },
      idleAnimation: {
        value: 0
      },
      idleWaveHeight: {
        value: settings.idleWaveHeight
      },

      // Enhanced kick/beat detection uniforms
      kickEnergy: {
        value: 0
      },
      beatPhase: {
        value: 0
      },
      bounceEffect: {
        value: 0
      },

      // Settings uniforms
      baseSpeed: {
        value: settings.baseSpeed
      },
      idleSpeed: {
        value: settings.idleSpeed
      },
      bassReactivity: {
        value: settings.bassReactivity
      },
      midReactivity: {
        value: settings.midReactivity
      },
      highReactivity: {
        value: settings.highReactivity
      },
      kickReactivity: {
        value: settings.kickReactivity
      },
      bounceIntensity: {
        value: settings.bounceIntensity
      },
      waveIntensity: {
        value: settings.waveIntensity
      },
      waveComplexity: {
        value: settings.waveComplexity
      },
      rippleIntensity: {
        value: settings.rippleIntensity
      },
      lineThickness: {
        value: settings.lineThickness
      },

      // Grain uniforms
      enableGrain: {
        value: settings.enableGrain
      },
      grainIntensity: {
        value: settings.grainIntensity
      },
      grainSpeed: {
        value: settings.grainSpeed
      },
      grainMean: {
        value: settings.grainMean
      },
      grainVariance: {
        value: settings.grainVariance
      },
      grainBlendMode: {
        value: 0
      }, // Default to Addition

      // Color uniforms
      bgColorDown: {
        value: new THREE.Vector3(
          settings.bgColorDown[0] / 255,
          settings.bgColorDown[1] / 255,
          settings.bgColorDown[2] / 255
        )
      },
      bgColorUp: {
        value: new THREE.Vector3(
          settings.bgColorUp[0] / 255,
          settings.bgColorUp[1] / 255,
          settings.bgColorUp[2] / 255
        )
      },
      color1In: {
        value: new THREE.Vector3(
          settings.color1In[0] / 255,
          settings.color1In[1] / 255,
          settings.color1In[2] / 255
        )
      },
      color1Out: {
        value: new THREE.Vector3(
          settings.color1Out[0] / 255,
          settings.color1Out[1] / 255,
          settings.color1Out[2] / 255
        )
      },
      color2In: {
        value: new THREE.Vector3(
          settings.color2In[0] / 255,
          settings.color2In[1] / 255,
          settings.color2In[2] / 255
        )
      },
      color2Out: {
        value: new THREE.Vector3(
          settings.color2Out[0] / 255,
          settings.color2Out[1] / 255,
          settings.color2Out[2] / 255
        )
      },
      color3In: {
        value: new THREE.Vector3(
          settings.color3In[0] / 255,
          settings.color3In[1] / 255,
          settings.color3In[2] / 255
        )
      },
      color3Out: {
        value: new THREE.Vector3(
          settings.color3Out[0] / 255,
          settings.color3Out[1] / 255,
          settings.color3Out[2] / 255
        )
      }
    }
  });

  // Create a plane geometry that fills the screen
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Create mesh with shader material
  const mesh = new THREE.Mesh(geometry, shaderMaterial);
  scene.add(mesh);

  // Set up dat.gui
  setupGUI();

  // Set up event listeners
  setupEventListeners();

  // Set up audio
  setupAudio();
  toggleAudio();
  // Start animation loop
  animate();
}

// Set up dat.gui
function setupGUI() {
  gui = new GUI({
    width: 300
  });

  // Create folders for organization
  const animationFolder = gui.addFolder("Animation");
  const audioFolder = gui.addFolder("Audio Reactivity");
  const kickFolder = gui.addFolder("Kick/Beat Effects");
  const visualFolder = gui.addFolder("Visual Settings");
  const transitionFolder = gui.addFolder("Transition Settings"); // New folder
  const colorFolder = gui.addFolder("Color Settings");
  const grainFolder = gui.addFolder("Film Grain");
  const advancedFolder = gui.addFolder("Advanced");

  // Animation settings
  animationFolder.add(settings, "baseSpeed", 0.1, 3.0).onChange((value) => {
    shaderMaterial.uniforms.baseSpeed.value = value;
  });
  animationFolder.add(settings, "idleSpeed", 0.01, 0.5).onChange((value) => {
    shaderMaterial.uniforms.idleSpeed.value = value;
  });
  animationFolder.open();

  // Audio reactivity settings
  audioFolder.add(settings, "bassReactivity", 0.0, 3.0).onChange((value) => {
    shaderMaterial.uniforms.bassReactivity.value = value;
  });
  audioFolder.add(settings, "midReactivity", 0.0, 3.0).onChange((value) => {
    shaderMaterial.uniforms.midReactivity.value = value;
  });
  audioFolder.add(settings, "highReactivity", 0.0, 3.0).onChange((value) => {
    shaderMaterial.uniforms.highReactivity.value = value;
  });
  audioFolder.open();

  // Kick/Beat effects settings
  kickFolder
    .add(settings, "kickReactivity", 0.0, 3.0)
    .name("Kick Reactivity")
    .onChange((value) => {
      shaderMaterial.uniforms.kickReactivity.value = value;
    });
  kickFolder
    .add(settings, "bounceIntensity", 0.0, 1.0)
    .name("Bounce Intensity")
    .onChange((value) => {
      shaderMaterial.uniforms.bounceIntensity.value = value;
    });
  kickFolder
    .add(settings, "rippleIntensity", 0.0, 2.0)
    .name("Ripple Intensity")
    .onChange((value) => {
      shaderMaterial.uniforms.rippleIntensity.value = value;
    });
  kickFolder.open();

  // Transition settings
  transitionFolder
    .add(settings, "idleWaveHeight", 0.0, 0.1)
    .name("Idle Wave Height")
    .onChange((value) => {
      shaderMaterial.uniforms.idleWaveHeight.value = value;
    });
  transitionFolder
    .add(settings, "transitionSmoothness", 0.01, 0.1)
    .name("Transition Speed");
  transitionFolder.open();

  // Visual settings
  visualFolder.add(settings, "waveIntensity", 0.01, 1.0).onChange((value) => {
    shaderMaterial.uniforms.waveIntensity.value = value;
  });
  visualFolder.add(settings, "waveComplexity", 0.5, 3.0).onChange((value) => {
    shaderMaterial.uniforms.waveComplexity.value = value;
  });
  visualFolder.add(settings, "lineThickness", 0.5, 3.0).onChange((value) => {
    shaderMaterial.uniforms.lineThickness.value = value;
  });
  visualFolder
    .add(settings, "lineStraightness", 0.1, 5.0)
    .name("Line Straightness")
    .onChange((value) => {
      shaderMaterial.uniforms.lineStraightness.value = value;
    });
  visualFolder.open();

  // Color settings
  colorFolder
    .add(settings, "colorPreset", Object.keys(colorPresets))
    .onChange(applyColorPreset);
  colorFolder.addColor(settings, "bgColorDown").onChange(updateShaderColors);
  colorFolder.addColor(settings, "bgColorUp").onChange(updateShaderColors);
  colorFolder
    .addColor(settings, "color1In")
    .name("Bass Line In")
    .onChange(updateShaderColors);
  colorFolder
    .addColor(settings, "color1Out")
    .name("Bass Line Out")
    .onChange(updateShaderColors);
  colorFolder
    .addColor(settings, "color2In")
    .name("Mid Line In")
    .onChange(updateShaderColors);
  colorFolder
    .addColor(settings, "color2Out")
    .name("Mid Line Out")
    .onChange(updateShaderColors);
  colorFolder
    .addColor(settings, "color3In")
    .name("High Line In")
    .onChange(updateShaderColors);
  colorFolder
    .addColor(settings, "color3Out")
    .name("High Line Out")
    .onChange(updateShaderColors);
  colorFolder.add(settings, "resetColors");

  // Grain settings
  grainFolder.add(settings, "enableGrain").onChange((value) => {
    shaderMaterial.uniforms.enableGrain.value = value;
  });
  grainFolder.add(settings, "grainIntensity", 0.0, 0.3).onChange((value) => {
    shaderMaterial.uniforms.grainIntensity.value = value;
  });
  grainFolder.add(settings, "grainSpeed", 0.1, 5.0).onChange((value) => {
    shaderMaterial.uniforms.grainSpeed.value = value;
  });
  grainFolder.add(settings, "grainMean", -0.5, 0.5).onChange((value) => {
    shaderMaterial.uniforms.grainMean.value = value;
  });
  grainFolder.add(settings, "grainVariance", 0.1, 1.0).onChange((value) => {
    shaderMaterial.uniforms.grainVariance.value = value;
  });
  grainFolder
    .add(settings, "grainBlendMode", [
      "Addition",
      "Screen",
      "Overlay",
      "Soft Light",
      "Lighten-Only"
    ])
    .onChange((value) => {
      let modeValue = 0;
      switch (value) {
        case "Addition":
          modeValue = 0;
          break;
        case "Screen":
          modeValue = 1;
          break;
        case "Overlay":
          modeValue = 2;
          break;
        case "Soft Light":
          modeValue = 3;
          break;
        case "Lighten-Only":
          modeValue = 4;
          break;
      }
      shaderMaterial.uniforms.grainBlendMode.value = modeValue;
    });

  // Advanced settings
  advancedFolder.add(settings, "showGui").onChange((value) => {
    if (value) {
      gui.domElement.style.display = "block";
    } else {
      gui.domElement.style.display = "none";
    }
  });
  advancedFolder
    .add(settings, "showDebug")
    .name("Show Debug Info")
    .onChange((value) => {
      updateDebugDisplay();
    });

  // Set initial state
  gui.close(); // Start with GUI closed
}

// Set up event listeners
function setupEventListeners() {
  // Handle window resize
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    shaderMaterial.uniforms.iResolution.value.set(
      window.innerWidth,
      window.innerHeight
    );
  });

  // Handle mouse movement for shader
  window.addEventListener("mousemove", (event) => {
    shaderMaterial.uniforms.iMouse.value.set(event.clientX, event.clientY);
  });

  // Handle play button
  document.getElementById("playButton").addEventListener("click", toggleAudio);


  // Handle keyboard shortcuts
  window.addEventListener("keydown", (event) => {
    // Space bar to toggle play/pause
    if (event.code === "Space") {
      toggleAudio();
      event.preventDefault();
    }

    // 'G' key to toggle GUI
    if (event.code === "KeyG") {
      settings.showGui = !settings.showGui;
      gui.domElement.style.display = settings.showGui ? "block" : "none";

      // Update the controller
      for (let i = 0; i < gui.__controllers.length; i++) {
        const controller = gui.__controllers[i];
        if (controller.property === "showGui") {
          controller.updateDisplay();
        }
      }
    }

    // 'D' key to toggle debug info
    if (event.code === "KeyD") {
      settings.showDebug = !settings.showDebug;
      updateDebugDisplay();

      // Update the controller
      for (let i = 0; i < gui.__controllers.length; i++) {
        const controller = gui.__controllers[i];
        if (controller.property === "showDebug") {
          controller.updateDisplay();
        }
      }
    }
  });
}

// Set up audio
function setupAudio() {
  audioElement = new Audio();
  audioElement.crossOrigin = "anonymous";
  audioElement.preload = "auto";

  // Use the new audio URL
  audioElement.src = "";
  audioElement.loop = true;
  audioElement.muted = true;
}

// Toggle audio playback
function toggleAudio() {
  if (!playing) {
    // Initialize audio context if needed
    audioContext = new(window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    // Connect audio element to analyzer
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);


    // Resume audio context (needed for newer browsers)
    audioSource.muted = true;
    audioContext.resume().then(() => {
      // Play the track
      audioElement.play().catch((e) => {
        console.error("Error playing audio:", e);
      });
    });

    document.getElementById("playButton").textContent = "STOP";
    playing = true;
    shaderMaterial.uniforms.isPlaying.value = true;

    // Reset beat tracking
    beatTime = 0;
    lastKickTime = 0;
    beatInterval = 0;
  } else {
    // Stop playback
    audioElement.pause();
    document.getElementById("playButton").textContent = "PLAY";
    playing = false;
    shaderMaterial.uniforms.isPlaying.value = false;
  }
}

// Improved multi-band frequency analysis with better kick detection
function updateFrequencies() {
  if (!playing || !analyser) return;

  analyser.getByteFrequencyData(dataArray);

  // Divide spectrum into bands for better analysis
  const bands = [{
      name: "sub",
      range: [1, 4]
    }, // Sub-bass (20-40Hz)
    {
      name: "kick",
      range: [4, 9]
    }, // Kick drum focus (~40-80Hz)
    {
      name: "bass",
      range: [9, 20]
    }, // Bass range (80-160Hz)
    {
      name: "lowMid",
      range: [20, 40]
    }, // Low-mids (160-320Hz)
    {
      name: "mid",
      range: [40, 80]
    }, // Mids (320-640Hz)
    {
      name: "highMid",
      range: [80, 160]
    }, // High-mids (640-1280Hz)
    {
      name: "high",
      range: [160, 300]
    }, // Highs (1280-2400Hz)
    {
      name: "veryHigh",
      range: [300, 500]
    } // Very high (2400Hz+)
  ];

  // Process each band
  for (let i = 0; i < bands.length; i++) {
    const [start, end] = bands[i].range;
    const bandSlice = dataArray.slice(start, end);
    const bandAvg = getWeightedAverage(bandSlice);

    // Store current band energy (0-1 range)
    bandEnergies[i] = bandAvg;

    // Keep history for each band
    if (!bandHistories[i]) bandHistories[i] = [];
    bandHistories[i].unshift(bandAvg);
    if (bandHistories[i].length > historyLength) {
      bandHistories[i].pop();
    }
  }

  // Focus on kick drum band (band index 1) and bass band (band index 2)
  const kickAvg = bandEnergies[1];
  const bassAvg = bandEnergies[2];

  // Calculate recent history average for kick band
  const kickHistory = bandHistories[1];
  const recentKickAvg =
    kickHistory.slice(1).reduce((sum, val) => sum + val, 0) /
    (kickHistory.length - 1 || 1);

  // Enhanced kick detection - detect sudden spikes in energy
  // 1. Current energy must be significantly higher than recent average
  // 2. Absolute energy must be above a minimum threshold
  // 3. Must have been some time since last kick to avoid false positives
  const kickJump = kickAvg - recentKickAvg;
  const newKickDetected =
    kickJump > kickThreshold * 1.2 &&
    kickAvg > 0.15 &&
    (!kickDetected || performance.now() - lastKickTime > 150);

  // Handle kick detection
  if (newKickDetected) {
    // New kick detected
    kickDetected = true;
    kickEnergy = Math.min(1.0, kickAvg * kickSensitivity); // Scale with sensitivity
    kickImpactDuration = 10; // Set impact duration (frames)

    // Track beat timing
    const now = performance.now();
    if (lastKickTime > 0) {
      // Calculate beat interval from previous kick
      const newInterval = now - lastKickTime;
      if (newInterval > 200 && newInterval < 2000) {
        // Reasonable beat range
        beatInterval = beatInterval * 0.7 + newInterval * 0.3; // Smooth the intervals
      }
    }
    lastKickTime = now;
    beatTime = 0; // Reset beat phase

    console.log(
      "KICK detected!",
      kickAvg.toFixed(2),
      "jump:",
      kickJump.toFixed(2)
    );
  } else {
    // Decay kick energy
    kickEnergy *= kickDecay;

    // Reset detection when energy drops below threshold
    if (kickEnergy < 0.05) {
      kickDetected = false;
    }

    // Count down impact duration
    if (kickImpactDuration > 0) {
      kickImpactDuration--;
    }
  }

  // Calculate beat phase (0.0 to 1.0 representing position in beat cycle)
  if (beatInterval > 0) {
    beatTime += 16.67; // Approximately 60fps (16.67ms per frame)
    beatPhase = (beatTime % beatInterval) / beatInterval;
  }

  // Calculate bounce effect - more subtle
  let bounceValue = 0;
  if (kickImpactDuration > 0) {
    // Initial impact when kick is detected - more subtle curve
    bounceValue = Math.pow(kickImpactDuration / 10, 0.6) * 0.03;
  }

  // Add a smaller boost from kick energy
  bounceValue += kickEnergy * 0.025;

  // Apply frequency smoothing with different attack/decay rates

  // Bass frequencies (average of kick and bass bands)
  const combinedBass = (bandEnergies[1] * 1.2 + bandEnergies[2]) / 2.2;

  // Fast attack, medium decay for bass
  if (combinedBass > lowFreq * 1.1) {
    lowFreq = lowFreq * 0.3 + combinedBass * 0.7; // Fast attack
  } else {
    lowFreq = lowFreq * 0.85 + combinedBass * 0.15; // Medium decay
  }

  // Mid frequencies (average of lowMid and mid bands)
  const combinedMid = (bandEnergies[3] + bandEnergies[4]) / 2;

  // Medium attack/decay for mids
  if (combinedMid > midFreq * 1.1) {
    midFreq = midFreq * 0.4 + combinedMid * 0.6;
  } else {
    midFreq = midFreq * 0.8 + combinedMid * 0.2;
  }

  // High frequencies (average of highMid, high, and veryHigh bands)
  const combinedHigh =
    (bandEnergies[5] + bandEnergies[6] + bandEnergies[7]) / 3;

  // Balanced attack/decay for highs
  if (combinedHigh > highFreq * 1.05) {
    highFreq = highFreq * 0.5 + combinedHigh * 0.5;
  } else {
    highFreq = highFreq * 0.8 + combinedHigh * 0.2;
  }

  // Boost low frequencies with kick energy (more subtle)
  lowFreq = Math.max(lowFreq, kickEnergy * 0.6);

  // Update shader uniforms
  shaderMaterial.uniforms.lowFreq.value = lowFreq;
  shaderMaterial.uniforms.midFreq.value = midFreq;
  shaderMaterial.uniforms.highFreq.value = highFreq;
  shaderMaterial.uniforms.kickEnergy.value = kickEnergy;
  shaderMaterial.uniforms.beatPhase.value = beatPhase;
  shaderMaterial.uniforms.bounceEffect.value = bounceValue;

  // Update debug display if enabled
  if (settings.showDebug) {
    updateDebugDisplay();
  }
}

// Improved average calculation with emphasis on peaks
function getWeightedAverage(array) {
  if (array.length === 0) return 0;

  let sum = 0;
  let weight = 0;
  let maxVal = 0;
  const emphasizeFactor = 1.5; // Reduced from 1.8 for more linear response

  for (let i = 0; i < array.length; i++) {
    // Normalize value 0-1
    const value = array[i] / 255;
    maxVal = Math.max(maxVal, value);

    // Apply non-linear emphasis to higher values
    const emphasized = Math.pow(value, emphasizeFactor);

    sum += emphasized;
    weight++;
  }

  // Combine average with max value for better peak detection
  const avg = sum / weight;
  return avg * 0.7 + maxVal * 0.3; // Blend average and peak
}

// Animation loop
function animate(timestamp) {
  requestAnimationFrame(animate);

  // Update time uniform
  time += 0.01;
  shaderMaterial.uniforms.iTime.value = time;

  // Update idle animation even when not playing
  idleAnimation += 0.01;
  shaderMaterial.uniforms.idleAnimation.value = idleAnimation;

  // Update transition factor for smooth animation - use transitionSmoothness
  const transitionRate = settings.transitionSmoothness;

  if (playing && transitionFactor < 1.0) {
    // Gradually increase transition factor when starting music
    transitionFactor = Math.min(transitionFactor + transitionRate, 1.0);
    shaderMaterial.uniforms.transitionFactor.value = transitionFactor;
  } else if (!playing && transitionFactor > 0.0) {
    // Gradually decrease transition factor when stopping music
    transitionFactor = Math.max(transitionFactor - transitionRate, 0.0);
    shaderMaterial.uniforms.transitionFactor.value = transitionFactor;

    // Only reset frequency values when transition is complete
    if (transitionFactor === 0) {
      lowFreq = 0;
      midFreq = 0;
      highFreq = 0;
      kickEnergy = 0;
      shaderMaterial.uniforms.lowFreq.value = 0;
      shaderMaterial.uniforms.midFreq.value = 0;
      shaderMaterial.uniforms.highFreq.value = 0;
      shaderMaterial.uniforms.kickEnergy.value = 0;
      shaderMaterial.uniforms.bounceEffect.value = 0;
    }
  }

  // Update audio frequencies
  updateFrequencies();

  // Render the scene
  renderer.render(scene, camera);

  // Calculate FPS
  frameCount++;
  const now = timestamp;
  if (now - lastTime >= 1000) {
    const fps = Math.round((frameCount * 1000) / (now - lastTime));
    fpsElement.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastTime = now;
  }
}

// Initialize when DOM is ready
function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      initLocomotiveScroll();
    });
  } else {
    // DOM is already loaded
    init();
    initLocomotiveScroll();
  }
}

// Also try on window load as fallback
window.addEventListener('load', () => {
  if (!scene) {
    init();
  }
  initLocomotiveScroll();
});

// Start initialization
initializeWhenReady();

// Apply color preset
applyColorPreset(settings.colorPreset);

// Spiral animation
(function () {
  const N = 600; // total dots
  const SIZE = 400; // SVG px
  const DOT_RADIUS = 2; // px
  const MARGIN = 2; // px padding
  const DURATION = 3; // seconds per pulse cycle
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // 2π/φ²
  const CENTER = SIZE / 2;
  const MAX_RADIUS = CENTER - MARGIN - DOT_RADIUS;
  const svgNS = "http://www.w3.org/2000/svg";
  
  // Wait for DOM to be ready
  function createSpiral() {
    const spiralElement = document.getElementById("spiral");
    if (!spiralElement) {
      setTimeout(createSpiral, 100);
      return;
    }
    
    // Create SVG root
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", SIZE);
    svg.setAttribute("height", SIZE);
    svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
    spiralElement.appendChild(svg);
    
    // Generate & animate dots
    for (let i = 0; i < N; i++) {
      const idx = i + 0.5;
      const frac = idx / N;
      const r = Math.sqrt(frac) * MAX_RADIUS;
      const theta = idx * GOLDEN_ANGLE;
      const x = CENTER + r * Math.cos(theta);
      const y = CENTER + r * Math.sin(theta);
      
      // Perfect SVG circle
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", x);
      c.setAttribute("cy", y);
      c.setAttribute("r", DOT_RADIUS);
      svg.appendChild(c);
      
      // Radius pulse
      const animR = document.createElementNS(svgNS, "animate");
      animR.setAttribute("attributeName", "r");
      animR.setAttribute(
        "values",
        `${DOT_RADIUS * 0.5};${DOT_RADIUS * 1.5};${DOT_RADIUS * 0.5}`
      );
      animR.setAttribute("dur", `${DURATION}s`);
      animR.setAttribute("begin", `${frac * DURATION}s`);
      animR.setAttribute("repeatCount", "indefinite");
      animR.setAttribute("calcMode", "spline");
      animR.setAttribute("keySplines", "0.4 0 0.6 1;0.4 0 0.6 1");
      c.appendChild(animR);
      
      // Opacity pulse
      const animO = document.createElementNS(svgNS, "animate");
      animO.setAttribute("attributeName", "opacity");
      animO.setAttribute("values", "0.3;1;0.3");
      animO.setAttribute("dur", `${DURATION}s`);
      animO.setAttribute("begin", `${frac * DURATION}s`);
      animO.setAttribute("repeatCount", "indefinite");
      animO.setAttribute("calcMode", "spline");
      animO.setAttribute("keySplines", "0.4 0 0.6 1;0.4 0 0.6 1");
      c.appendChild(animO);
    }
  }
  
  createSpiral();
})();