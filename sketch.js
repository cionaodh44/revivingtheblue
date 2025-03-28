let t = 0;

function setup() {
  createCanvas(1920, 1080);
  strokeWeight(1);
  smooth();
}

function draw() {
  background(0);

  t += 0.02;

  let waveCount = 15;

  for (let i = 0; i < waveCount; i++) {
    let yPos = map(i, 0, waveCount, 0, height);

    beginShape();
    noFill();
    stroke(255);

    for (let x = 0; x < width; x++) {
      let baseWave = sin(x * 0.02 + t + i * 0.5);
      let detailWave = sin(x * 0.1 + t * 1.5) * 0.5;

      let offsetY = baseWave * 20 + detailWave * 10;

      vertex(x, yPos + offsetY);
    }

    endShape();
  }
}

function mousePressed() {
  t = random(100);
}
