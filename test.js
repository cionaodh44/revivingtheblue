let bgImg;
let boatImg;
let blackBgAlpha = 255; // Still 0-255 for logic, convert when used with fill/stroke
let fadeOutSpeed = 2;
let lastMouseOutTime = 0;
let mouseInTopBorder = false;
let resetButtonSize = 30;
let isResetting = false;

let waterDrops = [];
let particles = [];

// Bubble Variables
let bubbles = [];
let glowIntensity;

// Boat Rocking Variables
let boatRockAngle = 0; // Current angle (will be calculated in draw)
let boatRockSpeed = 0.05; // How fast it rocks
let boatMaxRock = Math.PI / 45; // Max angle in radians (about 4 degrees)

function preload() {
  bgImg = loadImage('bg.png');
  boatImg = loadImage('boat.png');
}

function setup() {
  createCanvas(1920, 1080);
  imageMode(CENTER);
  strokeWeight(1);
  smooth();

  // Set color mode for bubbles (and now the whole sketch)
  // HSB: Hue (0-360), Saturation (0-100), Brightness (0-100), Alpha (0-1)
  colorMode(HSB, 360, 100, 100, 1);

  // Create a random seed for bubble visuals
  glowIntensity = random(0.8, 2);

  // Create bubbles
  for (let i = 0; i < 120; i++) {
    bubbles.push(new Bubble());
  }
}

function draw() {
  // Draw background image first
  push();
  colorMode(RGB); // Temporarily switch back for image if HSB causes issues
  image(bgImg, width / 2, height / 2, width, height);
  pop(); // Restore HSB mode

  // Bubble trail effect
  fill(220, 70, 5, 0.15);
  rect(0, 0, width, height);

  // --- Fade logic ---
  if (mouseY >= 0 && mouseY <= 20) {
    mouseInTopBorder = true;
    if (blackBgAlpha > 0 && !isResetting) {
      blackBgAlpha -= fadeOutSpeed;
      blackBgAlpha = constrain(blackBgAlpha, 0, 255);
    }
  } else {
    mouseInTopBorder = false;
    lastMouseOutTime = millis();
  }

  // Draw fade rectangle using HSB
  fill(0, 0, 0, blackBgAlpha / 255);
  rect(0, 0, width, height);

  // --- Draw Bubbles ---
  for (let bubble of bubbles) {
    bubble.update();
    bubble.display();
  }

  // --- Draw Boat with Rocking ---
  push(); // Isolate transformations for the boat
  translate(mouseX, mouseY); // Move origin to the boat's center position

  // Calculate rocking angle based on time (frameCount)
  // Use mouseX variation slightly to make rocking change with horizontal movement
  let rockInput = frameCount * boatRockSpeed + mouseX * 0.001;
  boatRockAngle = sin(rockInput) * boatMaxRock;
  rotate(boatRockAngle); // Apply rotation

  // Draw the boat centered at the new, rotated origin
  // imageMode(CENTER) is already set in setup()
  image(boatImg, 0, 0);

  pop(); // Restore original drawing state (removes translate/rotate)


  // --- Draw Reset Button ---
  drawResetButton();

  // --- Draw Water Drops ---
  for (let i = waterDrops.length - 1; i >= 0; i--) {
    waterDrops[i].update();
    waterDrops[i].display();
    if (waterDrops[i].isDone()) {
      waterDrops.splice(i, 1);
    }
  }

  // --- Draw Water Particles ---
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  // --- Create Particles on Mouse Move ---
  if (mouseX !== pmouseX || mouseY !== pmouseY) {
    for (let i = 0; i < 5; i++) {
      particles.push(new WaterParticle(
        mouseX + random(-15, 15),
        mouseY + random(-15, 15)
      ));
    }
  }
}

function drawResetButton() {
  fill(0, 0, 100); // White in HSB
  noStroke();
  rect(10, height - 10 - resetButtonSize, resetButtonSize, resetButtonSize);
   strokeWeight(1); // Restore default stroke weight
}

function mouseClicked() {
  if (
    mouseX > 10 &&
    mouseX < 10 + resetButtonSize &&
    mouseY > height - 10 - resetButtonSize &&
    mouseY < height - 10
  ) {
    resetSketch();
  } else {
    if (!mouseInTopBorder || blackBgAlpha <= 10) {
         waterDrops.push(new WaterDrop(mouseX, mouseY));
    }
  }
}

function resetSketch() {
  if (!isResetting) {
    isResetting = true;
    let fadeSpeed = 1;
    let fadeInterval = setInterval(() => {
      blackBgAlpha += fadeSpeed * 5;
      blackBgAlpha = constrain(blackBgAlpha, 0, 255);
      if (blackBgAlpha >= 255) {
        clearInterval(fadeInterval);
        blackBgAlpha = 255;
        mouseInTopBorder = false;
        lastMouseOutTime = 0;
        isResetting = false;
        // Optional resets can go here
      }
    }, 20);
  }
}

// ==========================
// Classes (WaterParticle, WaterDrop, MiniRipple, Bubble)
// Keep the class definitions exactly as they were in the previous step
// They are already adjusted for HSB color mode.
// ==========================

class WaterParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.lifespan = 255; // Keep lifespan logic 0-255
    this.size = random(5, 12);
    this.ySpeed = random(0.8, 2.5);
    this.xSpeed = random(-0.8, 0.8);
    this.opacityBase = random(0.7, 1.0); // Opacity base 0-1
    this.blueHue = random(180, 230); // Hue for blue tones
    this.saturation = random(60, 90);
    this.brightness = random(80, 100);
  }

  update() {
    this.lifespan -= 5;
    this.y += this.ySpeed;
    this.x += this.xSpeed;
    this.size -= 0.05;
  }

  display() {
    let currentAlpha = this.opacityBase * (this.lifespan / 255);
    noStroke();
    // HSB color: Use blueHue, defined saturation/brightness, calculated alpha
    fill(this.blueHue, this.saturation, this.brightness, currentAlpha);

    push();
    translate(this.x, this.y);
    beginShape();
    for (let i = 0; i < TWO_PI; i += 0.1) {
      let r = this.size * (1 + sin(i) * 0.3);
      let x = r * cos(i);
      let y = r * sin(i);
      vertex(x, y + (sin(i) * this.size * 0.2));
    }
    endShape(CLOSE);

    // Inner highlight (White in HSB: 0, 0, 100)
    fill(0, 0, 100, currentAlpha * 0.3); // White with adjusted alpha
    ellipse(0, -this.size / 4, this.size * 0.5, this.size * 0.3);
    pop();

    // Create mini ripples
    if (random() < 0.02 && this.y < height - 10) {
       // Ensure MiniRipple uses HSB too
       waterDrops.push(new MiniRipple(this.x, this.y + this.size));
    }
  }

  isDead() {
    return this.lifespan <= 0 || this.size <= 0.5;
  }
}

class WaterDrop {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.maxRadius = 150;
    this.opacity = 1.0; // Opacity 0-1
    this.speed = 6;
    this.hue = 200; // Base blue hue
    this.saturation1 = 80;
    this.saturation2 = 60;
    this.brightness = 100;
  }

  update() {
    this.radius += this.speed;
    this.opacity -= 0.015; // Adjust fade speed for 0-1 range
    this.opacity = max(0, this.opacity); // Ensure opacity doesn't go below 0
  }

  display() {
    noFill();
    // HSB stroke 1
    strokeWeight(4);
    stroke(this.hue, this.saturation1, this.brightness, this.opacity);
    ellipse(this.x, this.y, this.radius * 2);

    // HSB stroke 2 (slightly different saturation/alpha)
    strokeWeight(2); // Maybe thinner?
    stroke(this.hue, this.saturation2, this.brightness, this.opacity * 0.7);
    ellipse(this.x, this.y, this.radius * 1.5);

     strokeWeight(1); // Reset stroke weight
  }

  isDone() {
    // Check against opacity and radius
    return this.opacity <= 0 || this.radius >= this.maxRadius;
  }
}

class MiniRipple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 3;
    this.maxRadius = random(15, 30);
    this.opacity = 0.8; // Opacity 0-1
    this.speed = 1.0;
    this.hue = 210; // Slightly different blue
    this.saturation = 50;
    this.brightness = 100;
  }

  update() {
    this.radius += this.speed;
    this.opacity -= 0.04; // Adjust fade speed for 0-1 range
     this.opacity = max(0, this.opacity);
  }

  display() {
    noFill();
    // HSB stroke
    stroke(this.hue, this.saturation, this.brightness, this.opacity);
    strokeWeight(1);
    ellipse(this.x, this.y, this.radius * 2);
  }

  isDone() {
    return this.opacity <= 0 || this.radius >= this.maxRadius;
  }
}

class Bubble {
  constructor() {
    this.reset();
    this.y = random(height); // Start some bubbles within the screen
    this.oscillation = random(TWO_PI);
    this.oscillationSpeed = random(0.02, 0.05);
    // Hue is already HSB compatible (160-240 is cyan/blue range)
    this.hue = random(160, 240);
  }

  reset() {
    this.x = random(width);
    this.y = height + random(20, 50); // Start below screen
    this.size = random(5, 40);
    this.speed = random(0.5, 2.5);
    this.alpha = random(0.2, 0.7); // Alpha is already 0-1 range
  }

  update() {
    this.y -= this.speed;
    // Add horizontal oscillation
    this.x += sin(this.oscillation) * 0.8;
    this.oscillation += this.oscillationSpeed;

    // Reset bubble if it goes off the top
    if (this.y < -this.size) {
      this.reset();
    }
  }

  display() {
    // Calculate shimmering alpha based on time and oscillation
    let shimmerAlpha = this.alpha * (0.5 + 0.5 * sin(frameCount * 0.1 + this.oscillation));

    // Holographic glow effect using native canvas context
    drawingContext.shadowBlur = 15 * glowIntensity;
    // Shadow color uses HSB values directly
    drawingContext.shadowColor = color(this.hue, 70, 100, shimmerAlpha); // Use HSB

    noFill();
    strokeWeight(1.5);
    // Stroke color uses HSB
    stroke(this.hue, 60, 100, shimmerAlpha);
    ellipse(this.x, this.y, this.size);

    // Inner highlight
    // Stroke color uses HSB
    stroke(this.hue, 30, 100, shimmerAlpha * 0.7);
    ellipse(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.4);

    // IMPORTANT: Reset shadow effect so it doesn't affect other elements
    drawingContext.shadowBlur = 0;
     strokeWeight(1); // Reset stroke weight if needed
  }
}


function mousePressed() {
  // No action needed here for now
}