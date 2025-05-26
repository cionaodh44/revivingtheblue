let bg, boat, fish, textImg;
let circleImg, boatExtraImg, bgExtraImg, fishExtraImg, textExtraImg; 

let fadeAlpha = 0;
let resetting = false;
let btnSz = 30;
let drops = [];
let particles = [];
let bubbles = [];
let glow;
let boatPos, pBoatPos;
let boatLerp = 0.08;
let maxP = 15;
let fishMaxP = maxP * 2;
let swaySpeed = 0.05;
let maxSway = Math.PI / 45;
let mouseVelocitySensitivity = 0.005;
let maxAngleFromVelocity = Math.PI / 18;
let tiltSmoothing = 0.08;
let currentMouseTiltAngle = 0;
let targetFps = 30;
let exportSeconds = 30;
let totalFrames = targetFps * exportSeconds;
let enableExport = false;

let audioContext;
let bgmSound, waveSound, vocalSound;
let isAudioInitialized = false;
let isTopBorder = false;
let previousIsTopBorder = false;

let gui;
const BUBBLE_BASE_MIN_SIZE = 5;
const BUBBLE_BASE_MAX_SIZE = 40;
const BUBBLE_SIZE_MULTIPLIER_MIN = 0.1;
const BUBBLE_SIZE_MULTIPLIER_MAX = 3.0;

const defaultGuiControls = {
  backgroundOverlayOpacity: 0,
  parallaxIntensity: 15,
  numBubbles: 120,
  bubbleSizeMultiplier: 1.0,
  bubbleSpeedMultiplier: 1.0,
};
let guiControls = { ...defaultGuiControls };

let isMouseDown = false;
let mouseDownStartTime = 0;
const HOLD_DURATION = 1000; 
let holdTriggeredThisPress = false; 

let interactionState = 'original'; 
let animationPhase = 'idle'; 
let animationStartTime = 0;

const CIRCLE_FADE_IN_DURATION = 500;
const CIRCLE_ZOOM_DURATION = 2000;
const CIRCLE_FADE_OUT_DURATION = 500;
// IMAGE_TRANSITION_DURATION is no longer needed

let circleAlpha = 0;
let circleScale = 1;
const CIRCLE_INITIAL_SCALE = 0.1; 
const CIRCLE_TARGET_SCALE = 1.5;  
let circleRotationAngle = 0;

// currentImageFadeProgress is no longer needed

function preload() {
  const loadImageSafe = (path) => {
    try {
      let img = loadImage(path, 
        () => console.log(`Successfully loaded: ${path}`), 
        (errEvent) => console.error(`Error loading image: ${path}`, errEvent)
      );
      if (typeof img === 'undefined' || img === null) {
          console.error(`loadImage returned invalid for ${path}.`);
      }
      return img;
    } catch (e) {
      console.error(`Exception during loadImage for ${path}:`, e);
      return createGraphics(1,1); 
    }
  };

  bg = loadImageSafe('bg.png');
  boat = loadImageSafe('boat.png');
  fish = loadImageSafe('fish.png');
  textImg = loadImageSafe('text.png');

  circleImg = loadImageSafe('circle.png');
  boatExtraImg = loadImageSafe('boatextra.png');
  bgExtraImg = loadImageSafe('bgextra.png');
  fishExtraImg = loadImageSafe('fishextra.png');
  textExtraImg = loadImageSafe('textextra.png');
  
  soundFormats('wav');
  bgmSound = loadSound('bgm.wav');
  waveSound = loadSound('wave.wav');
  vocalSound = loadSound('vocal.wav');
}

function setupAudio() {
  if (isAudioInitialized) return;
  userStartAudio().then(() => {
    console.log("Audio context started");
    if (bgmSound && bgmSound.isLoaded()) { bgmSound.loop(); bgmSound.setVolume(0.5); }
    if (waveSound && waveSound.isLoaded()) { waveSound.loop(); waveSound.setVolume(0.7); }
    if (vocalSound && vocalSound.isLoaded()) { vocalSound.setLoop(true); vocalSound.setVolume(0); vocalSound.loop(); }
    isAudioInitialized = true;
  }).catch(err => console.error("Error starting audio:", err));
}

function setup() {
  createCanvas(1920, 1080);
  imageMode(CENTER);
  smooth();
  colorMode(HSB, 360, 100, 100, 1);
  frameRate(targetFps);
  glow = random(0.8, 2);
  boatPos = createVector(width / 2, height / 2);
  pBoatPos = boatPos.copy();
  
  updateBubbleCount(); 
  
  if (enableExport) console.log(`Exporting ${totalFrames} frames...`);
  
  let audioButton = createButton('Start Audio');
  audioButton.position(width - 120, 10); 
  audioButton.mousePressed(setupAudio);

  gui = new lil.GUI({ width: 280 });
  gui.domElement.style.marginTop = '50px'; 
  const sceneFolder = gui.addFolder('Scene & Background');
  sceneFolder.add(guiControls, 'backgroundOverlayOpacity', 0, 1, 0.01).name('Bg Opacity');
  sceneFolder.add(guiControls, 'parallaxIntensity', 5, 50, 1).name('Parallax Intensity')
    .onChange(handleParallaxChange);
  const bubblesFolder = gui.addFolder('Bubbles');
  bubblesFolder.add(guiControls, 'numBubbles', 0, 300, 1).name('Number of Bubbles')
    .onChange(updateBubbleCount);
  bubblesFolder.add(guiControls, 'bubbleSizeMultiplier', BUBBLE_SIZE_MULTIPLIER_MIN, BUBBLE_SIZE_MULTIPLIER_MAX, 0.05).name('Bubble Size Scale')
    .onChange(function(value) {
      bubbles.forEach(b => {
        let minSize = BUBBLE_BASE_MIN_SIZE * value;
        let maxSize = BUBBLE_BASE_MAX_SIZE * value;
        b.sz = random(minSize, maxSize);
        b.sz = max(1, b.sz); 
      });
    });
  bubblesFolder.add(guiControls, 'bubbleSpeedMultiplier', 0.1, 3.0, 0.05).name('Bubble Speed');
  gui.add({ reset: resetGuiControlsAndApply }, 'reset').name('Reset All Controls');
  handleParallaxChange(guiControls.parallaxIntensity);

  if (!bg || !bg.width || !boat || !boat.width || !circleImg || !circleImg.width) {
      console.error("CRITICAL ERROR: One or more essential images did not load. Check paths and console.");
  }
}

function handleParallaxChange(value) {
  maxP = value;
  fishMaxP = maxP * 2;
}

function updateBubbleCount() {
  let targetCount = Math.floor(guiControls.numBubbles);
  if (targetCount < 0) targetCount = 0;
  while (bubbles.length < targetCount) {
    bubbles.push(new Bubble());
  }
  while (bubbles.length > targetCount) {
    bubbles.pop();
  }
}

function resetGuiControlsAndApply() {
  for (const key in defaultGuiControls) {
    if (guiControls.hasOwnProperty(key)) {
      guiControls[key] = defaultGuiControls[key];
    }
  }
  handleParallaxChange(guiControls.parallaxIntensity);
  updateBubbleCount(); 
  bubbles.forEach(b => {
    let minSize = BUBBLE_BASE_MIN_SIZE * guiControls.bubbleSizeMultiplier;
    let maxSize = BUBBLE_BASE_MAX_SIZE * guiControls.bubbleSizeMultiplier;
    b.sz = random(minSize, maxSize);
    b.sz = max(1, b.sz);
    if (typeof b.baseSpeed === 'undefined') { 
        b.baseSpeed = random(0.5, 2.5); 
    }
  });
}

function updateInteractionAnimations() {
    if (animationPhase === 'idle') return;

    let currentTime = millis();
    let elapsedTime = currentTime - animationStartTime;
    const ROTATION_SPEED = 0.03; 

    if (animationPhase === 'circleFadeIn') {
        let progress = constrain(elapsedTime / CIRCLE_FADE_IN_DURATION, 0, 1);
        circleAlpha = progress * 255;
        circleScale = CIRCLE_INITIAL_SCALE;
        circleRotationAngle += ROTATION_SPEED; 
        if (progress >= 1) {
            animationPhase = 'circleZoom';
            animationStartTime = currentTime;
        }
    } else if (animationPhase === 'circleZoom') {
        let progress = constrain(elapsedTime / CIRCLE_ZOOM_DURATION, 0, 1);
        circleScale = lerp(CIRCLE_INITIAL_SCALE, CIRCLE_TARGET_SCALE, progress);
        circleAlpha = 255;
        circleRotationAngle += ROTATION_SPEED;
        if (progress >= 1) {
            animationPhase = 'circleFadeOut';
            animationStartTime = currentTime;
        }
    } else if (animationPhase === 'circleFadeOut') {
        let progress = constrain(elapsedTime / CIRCLE_FADE_OUT_DURATION, 0, 1);
        circleAlpha = (1 - progress) * 255;
        circleScale = CIRCLE_TARGET_SCALE;
        circleRotationAngle += ROTATION_SPEED;
        if (progress >= 1) {
            // Circle animation done, now switch images instantly
            if (interactionState === 'original') {
                interactionState = 'extra';
            } else {
                interactionState = 'original';
            }
            animationPhase = 'idle'; // Back to idle, sequence complete
            circleAlpha = 0; // Ensure circle is fully invisible
            holdTriggeredThisPress = false; // Allow next hold sequence if mouse is still down
        }
    }
    // The 'imageTransition' phase is removed as the switch is now instant
}

function drawFadingImageSet(originalImg, extraImg, x, y, w, h, pX = 0, pY = 0) {
    // Fallback logic if one image is missing
    if (!originalImg || !originalImg.width || (interactionState === 'extra' && (!extraImg || !extraImg.width)) ) {
        let imgToDraw = null;
        if (interactionState === 'original' && originalImg && originalImg.width) imgToDraw = originalImg;
        else if (interactionState === 'extra' && extraImg && extraImg.width) imgToDraw = extraImg;
        else if (originalImg && originalImg.width) imgToDraw = originalImg; // Default to original if extra is expected but missing
        else if (extraImg && extraImg.width) imgToDraw = extraImg;     // Default to extra if original is expected but missing (less likely)

        if (imgToDraw) {
            push();
            translate(x + pX, y + pY);
            image(imgToDraw, 0, 0, w, h);
            pop();
        }
        return;
    }
    
    push();
    translate(x + pX, y + pY);
    
    // Direct draw based on interactionState
    if (interactionState === 'original') {
        image(originalImg, 0, 0, w, h);
    } else {
        image(extraImg, 0, 0, w, h);
    }
    pop();
}


function draw() {
  background(0); 
  
  // Check for hold trigger only if idle and not already triggered in this press
  if (isMouseDown && !holdTriggeredThisPress && animationPhase === 'idle') {
    if (millis() - mouseDownStartTime >= HOLD_DURATION) {
      holdTriggeredThisPress = true; // Mark that a hold has been processed for this press
      animationPhase = 'circleFadeIn';
      animationStartTime = millis();
      circleAlpha = 0;
      circleScale = CIRCLE_INITIAL_SCALE;
      circleRotationAngle = 0; 
    }
  }
  
  updateInteractionAnimations();

  let normMouseX = (mouseX / width) - 0.5;
  let normMouseY = (mouseY / height) - 0.5;
  
  let bgParallaxX = normMouseX * -maxP;
  let bgParallaxY = normMouseY * -maxP;
  let fishParallaxX = normMouseX * -fishMaxP;
  let fishParallaxY = normMouseY * -fishMaxP;

  drawFadingImageSet(bg, bgExtraImg, width / 2, height / 2, width * 1.02, height * 1.02, bgParallaxX, bgParallaxY);
  drawFadingImageSet(fish, fishExtraImg, width / 2, height / 2, width * 1.02, height * 1.02, fishParallaxX, fishParallaxY);
  drawFadingImageSet(textImg, textExtraImg, width / 2, height / 2, width, height);

  let targetX = enableExport ? (width / 2 + sin(frameCount * 0.01) * width * 0.3) : mouseX;
  let targetY = enableExport ? (height / 2 + cos(frameCount * 0.015) * height * 0.3) : mouseY;
  if (boatPos && typeof boatPos.lerp === 'function') {
    boatPos.lerp(createVector(targetX, targetY), boatLerp);
  }

  previousIsTopBorder = isTopBorder;
  isTopBorder = enableExport ? false : (mouseY <= 20);
  
  if (isAudioInitialized) {
    if (isTopBorder && !previousIsTopBorder) {
      let fadeTime = 1.5; 
      if (waveSound && waveSound.isLoaded()) waveSound.fade(0, fadeTime);
      if (vocalSound && vocalSound.isLoaded()) { vocalSound.setVolume(0); vocalSound.fade(0.7, fadeTime); }
    } else if (!isTopBorder && previousIsTopBorder) {
      let fadeTime = 1.5;
      if (vocalSound && vocalSound.isLoaded()) vocalSound.fade(0, fadeTime);
      if (waveSound && waveSound.isLoaded()) { waveSound.setVolume(0); waveSound.fade(0.7, fadeTime); }
    }
  }

  if (isTopBorder && fadeAlpha > 0 && !resetting) {
     fadeAlpha = max(0, fadeAlpha - 5);
  }
  if (resetting) {
      fadeAlpha = min(255, fadeAlpha + 5); 
      if (fadeAlpha >= 255) resetting = false;
  }

  if (fadeAlpha > 0) {
      push();
      colorMode(RGB); 
      fill(0, 0, 0, fadeAlpha); 
      rect(0, 0, width, height);
      pop();
  }

  if (guiControls.backgroundOverlayOpacity > 0) {
    push();
    colorMode(RGB); 
    fill(0, 0, 0, guiControls.backgroundOverlayOpacity * 255); 
    rect(0, 0, width, height);
    pop();
  }

  bubbles.forEach(b => { b.update(); b.display(); });
  particles.forEach(p => { p.update(); p.display(); });
  drops.forEach(d => { d.update(); d.display(); });

  particles = particles.filter(p => !p.isDead());
  drops = drops.filter(d => !d.isDone());

  if (boatPos) { 
    push();
    translate(boatPos.x, boatPos.y);
    let swayFactor = frameCount * swaySpeed + boatPos.x * 0.001;
    let baseSwayAngle = sin(swayFactor) * maxSway;
    let velocityX = mouseX - pmouseX;
    let targetTiltAngle = constrain(velocityX * mouseVelocitySensitivity, -maxAngleFromVelocity, maxAngleFromVelocity);
    currentMouseTiltAngle = lerp(currentMouseTiltAngle, targetTiltAngle, tiltSmoothing);
    let finalBoatAngle = baseSwayAngle + currentMouseTiltAngle;
    rotate(finalBoatAngle);

    // --- Draw Circle (Rotates and Zooms) ---
    if (circleImg && circleImg.width && circleAlpha > 0) { // Simplified check
        push();
        rotate(circleRotationAngle); 
        tint(255, circleAlpha); 
        image(circleImg, 0, 0, circleImg.width * circleScale, circleImg.height * circleScale);
        pop();
    }
    
    // --- Draw Boat (Direct Switch) ---
    let boatToDraw = null;
    if (interactionState === 'original') {
        if (boat && boat.width) boatToDraw = boat;
    } else {
        if (boatExtraImg && boatExtraImg.width) boatToDraw = boatExtraImg;
    }

    if (boatToDraw) {
        image(boatToDraw, 0, 0); // No tinting needed for direct draw unless specified
    }
    pop(); // boat translate/rotate
  }


  push();
  colorMode(RGB); 
  fill(255);
  noStroke();
  rect(10, height - 10 - btnSz, btnSz, btnSz); 
  pop();

  if (!enableExport && (mouseX !== pmouseX || mouseY !== pmouseY)) {
    for (let i = 0; i < 3; i++) particles.push(new Particle(mouseX + random(-15, 15), mouseY + random(-15, 15)));
  }
  if (boatPos && pBoatPos && boatPos.dist(pBoatPos) > 2) { 
    for (let i = 0; i < 2; i++) particles.push(new Particle(boatPos.x + random(-10, 10), boatPos.y + random(5, 15), true));
  }
  if (pBoatPos && boatPos) pBoatPos.set(boatPos); 

  push();
  colorMode(RGB); 
  fill(255);
  textSize(16);
  textAlign(RIGHT, TOP);
  text(`F: ${frameCount} / ${enableExport ? totalFrames : '...'}`, width - 10, 10);
  pop();

  if (enableExport) {
    saveCanvas('frame-' + nf(frameCount, 5), 'png');
    if (frameCount >= totalFrames) {
      console.log(`Export finished.`);
      noLoop();
    }
  }
}

function mousePressed(event) { 
  if (!isAudioInitialized) {
    setupAudio(); 
  }
  isMouseDown = true;
  mouseDownStartTime = millis();
  // holdTriggeredThisPress is NOT reset here.
  // It's set to true when a hold initiates an animation.
  // It's set to false when an animation sequence finishes (in updateInteractionAnimations)
  // or when the mouse is released.

  if (enableExport) return;

  let isGuiClick = false;
  if (gui && gui.domElement && event && event.target) {
      isGuiClick = gui.domElement.contains(event.target);
  }

  if (mouseX > 10 && mouseX < 10 + btnSz && mouseY > height - 10 - btnSz && mouseY < height - 10) {
    startReset();
  } 
  else if (!isGuiClick && animationPhase === 'idle' && 
           (!(mouseY <= 20 && isTopBorder) || fadeAlpha <= 10)) { 
    drops.push(new Ripple(mouseX, mouseY));
  }
}

function mouseReleased() {
  isMouseDown = false;
  holdTriggeredThisPress = false; // Reset for the next actual press
}

function mouseClicked() {
  if (!isAudioInitialized) {
    setupAudio();
  }
}

function startReset() {
  if (resetting || enableExport) return;
  resetting = true;
  interactionState = 'original';
  animationPhase = 'idle'; 
  circleAlpha = 0;
  holdTriggeredThisPress = false; 
}

// ... (Particle, Ripple, Bubble classes remain the same)
class Bubble {
  constructor() {
    this.init(); 
    this.pos.y = random(height); 
    this.osc = random(TWO_PI);
    this.oscSpeed = random(0.02, 0.05);
    this.hue = random(160, 240);
   }

  init() {
    this.pos = createVector(random(width), height + random(20, 50)); 
    let sizeMultiplier = (guiControls && typeof guiControls.bubbleSizeMultiplier !== 'undefined') ? guiControls.bubbleSizeMultiplier : 1.0;
    let minSize = BUBBLE_BASE_MIN_SIZE * sizeMultiplier;
    let maxSize = BUBBLE_BASE_MAX_SIZE * sizeMultiplier;
    this.sz = random(minSize, maxSize);
    this.sz = max(1, this.sz); 
    this.baseSpeed = random(0.5, 2.5);
    this.alpha = random(0.2, 0.7);
  }

  update() {
      let speedMultiplier = (guiControls && typeof guiControls.bubbleSpeedMultiplier !== 'undefined') ? guiControls.bubbleSpeedMultiplier : 1.0;
      this.pos.y -= this.baseSpeed * speedMultiplier;
      this.pos.x += sin(this.osc) * 0.8; 
      this.osc += this.oscSpeed;
      if (this.pos.y < -this.sz) { 
          this.init();
      }
  }

  display() {
    let shimmer = this.alpha * (0.5 + 0.5 * sin(frameCount * 0.1 + this.osc));
    let shadowCol = color(this.hue, 70, 100, shimmer); 
    drawingContext.shadowBlur = 15 * glow; 
    drawingContext.shadowColor = shadowCol.toString(); 
    noFill();
    strokeWeight(1.5);
    stroke(this.hue, 60, 100, shimmer); 
    ellipse(this.pos.x, this.pos.y, this.sz);
    stroke(this.hue, 30, 100, shimmer * 0.7); 
    ellipse(this.pos.x - this.sz * 0.2, this.pos.y - this.sz * 0.2, this.sz * 0.4);
    drawingContext.shadowBlur = 0; 
    strokeWeight(1); 
  }
}

class Particle {
  constructor(x, y, isWake = false) {
    this.pos = createVector(x, y);
    this.isWake = isWake;
    this.vel = createVector(random(isWake ? -0.4 : -0.8, isWake ? 0.4 : 0.8), random(isWake ? 0.5 : 0.8, isWake ? 1.5 : 2.5));
    this.sz = random(isWake ? 2 : 5, isWake ? 6 : 12);
    this.life = random(isWake ? 80 : 200, isWake ? 150 : 255);
    this.initLife = this.life;
    this.alphaBase = random(isWake ? 0.4 : 0.7, isWake ? 0.7 : 1.0);
    this.hue = random(isWake ? 190 : 180, isWake ? 220 : 230); 
    this.sat = random(isWake ? 40 : 60, isWake ? 70 : 90); 
    this.bri = random(isWake ? 90 : 80, 100); 
  }
  update() {
    this.life -= (this.isWake ? 6 : 5);
    this.pos.add(this.vel);
    this.sz = max(0.5, this.sz - (this.isWake ? 0.08 : 0.05));
  }
  display() {
    let currentAlpha = this.alphaBase * constrain(this.life / this.initLife, 0, 1);
    fill(this.hue, this.sat, this.bri, currentAlpha); 
    noStroke();
    push();
    translate(this.pos.x, this.pos.y);
    if (this.isWake) {
      ellipse(0, 0, this.sz * 1.5);
    } else {
      ellipse(0, 0, this.sz);
      fill(0, 0, 100, currentAlpha * 0.3); 
      ellipse(0, -this.sz / 4, this.sz * 0.5, this.sz * 0.3);
      if (random() < 0.02 && this.pos.y < height - 10) {
        drops.push(new Ripple(this.pos.x, this.pos.y + this.sz / 2, true));
      }
    }
    pop();
  }
  isDead() { return this.life <= 0 || this.sz <= 0.5; }
}

class Ripple {
  constructor(x, y, isMini = false) {
    this.pos = createVector(x, y);
    this.isMini = isMini;
    this.alpha = isMini ? 0.8 : 1.0;
    this.r = isMini ? 3 : 8;
    this.maxR = isMini ? random(15, 30) : 150;
    this.speed = isMini ? 1.0 : 6.0;
    this.fadeRate = isMini ? 0.04 : 0.015;
    this.hue = isMini ? 210 : 200; 
    this.sat1 = isMini ? 50 : 80; 
    this.sat2 = 60; 
    this.bri = 100; 
  }
  update() { this.r += this.speed; this.alpha = max(0, this.alpha - this.fadeRate); }
  display() {
    noFill(); strokeWeight(this.isMini ? 1 : 4);
    stroke(this.hue, this.sat1, this.bri, this.alpha); 
    ellipse(this.pos.x, this.pos.y, this.r * 2);
    if (!this.isMini) {
      strokeWeight(2); stroke(this.hue, this.sat2, this.bri, this.alpha * 0.7); 
      ellipse(this.pos.x, this.pos.y, this.r * 1.5);
    }
    strokeWeight(1); 
  }
  isDone() { return this.alpha <= 0 || this.r >= this.maxR; }
}