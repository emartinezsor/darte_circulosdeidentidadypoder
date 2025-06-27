let table, tableElite;
let surnames = [];
let eliteSet = new Set();
let eliteData = [];
let circles = [];
let spacing = 6.2;
let margin = 5; // Margin on both sides in alphabetical view
let maxDiameter = 70;
let maxTotal;

let isEliteView = false; // Tracks current view

function preload() {
  table = loadTable("assets/Apellidos_CSV.csv", "csv", "header");
  tableElite = loadTable("assets/Apellidos_Asambleistas_CSV.csv", "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  textFont("Calibri");
  textSize(16);
  colorMode(HSB, 360, 100, 100);

  // Load elite surnames and totals
  for (let r = 0; r < tableElite.getRowCount(); r++) {
    let apellido = tableElite.getString(r, "ApellidoAsambleista");
    let total = float(tableElite.getString(r, "Total"));
    if (apellido && !isNaN(total)) {
      eliteSet.add(apellido.trim().toUpperCase());
      eliteData.push({ apellido: apellido.trim().toUpperCase(), total });
    }
  }

  // Load all surnames
  for (let r = 0; r < table.getRowCount(); r++) {
    let apellido = table.getString(r, "Apellidos");
    let total = float(table.getString(r, "Total"));
    if (apellido && !isNaN(total)) {
      surnames.push({ apellido, total });
    }
  }

  surnames.sort((a, b) => a.apellido.localeCompare(b.apellido));
  maxTotal = max(surnames.map(s => s.total));

  layoutCircles();
  restoreOriginalLayout();
}

function layoutCircles() {
  circles = [];

  let x = margin;
  let y = margin + 65;

  let uniqueLetters = [...new Set(surnames.map(s => s.apellido[0].toUpperCase()))];
  let colorMap = {};
  for (let i = 0; i < uniqueLetters.length; i++) {
    let hue = map(i, 0, uniqueLetters.length, 0, 360);
    colorMap[uniqueLetters[i]] = color(hue, 80, 80);
  }

  for (let s of surnames) {
    let diameter = map(s.total, 0, maxTotal, 2, maxDiameter);
    let radius = diameter / 2;
    let letter = s.apellido[0].toUpperCase();
    let fillColor = colorMap[letter] || color(0, 0, 50);

    if (x + diameter > width - margin) {
      x = margin;
      y += maxDiameter * 0.5 + spacing;
    }

    let eliteTotal = eliteData.find(e => e.apellido === s.apellido.toUpperCase())?.total || 0;

    circles.push({
      x: x + radius,
      y: y,
      r: radius,
      apellido: s.apellido,
      total: s.total,
      eliteTotal: eliteTotal,
      originalX: x + radius,
      originalY: y,
      originalColor: fillColor,
      color: fillColor
    });

    x += diameter + spacing;
  }
}

function applyEliteView() {
  isEliteView = true;

  const centerX = width / 2;
  const centerY = height / 2;
  const eliteRadius = min(width, height) / 3;

  const eliteCircles = [];
  const nonEliteCircles = [];

  for (let c of circles) {
    if (eliteSet.has(c.apellido.toUpperCase())) {
      eliteCircles.push(c);
    } else {
      nonEliteCircles.push(c);
    }
  }

  eliteCircles.sort((a, b) => b.r - a.r);

  let packed = [];
  let tries = 0;
  let maxTries = 5000;

  for (let c of eliteCircles) {
    let placed = false;
    let radius = c.r;

    while (!placed && tries < maxTries) {
      let angle = random(TWO_PI);
      let rad = random(0, eliteRadius - radius);
      let x = centerX + rad * cos(angle);
      let y = centerY + rad * sin(angle);

      let overlapping = false;
      for (let other of packed) {
        if (dist(x, y, other.x, other.y) < c.r + other.r + 2) {
          overlapping = true;
          break;
        }
      }

      if (!overlapping) {
        c.targetX = x;
        c.targetY = y;
        c.targetColor = color(0, 0, 15);
        packed.push({ x, y, r: radius });
        placed = true;
      }

      tries++;
    }

    if (!placed) {
      c.targetX = centerX + random(-10, 10);
      c.targetY = centerY + random(-10, 10);
      c.targetColor = color(0, 0, 15);
    }
  }

  for (let c of nonEliteCircles) {
    let safe = false;
    let attempt = 0;

    while (!safe && attempt < 500) {
      let x = random(margin, width - margin);
      let y = random(margin, height - margin);
      if (dist(x, y, centerX, centerY) > eliteRadius + c.r + 10) {
        c.targetX = x;
        c.targetY = y;
        c.targetColor = color(0, 0, 70);
        safe = true;
      }
      attempt++;
    }

    if (!safe) {
      c.targetX = random(margin, width - margin);
      c.targetY = random(margin, height - margin);
      c.targetColor = color(0, 0, 70);
    }
  }
}

function restoreOriginalLayout() {
  isEliteView = false;

  layoutCircles();
  for (let c of circles) {
    c.targetX = c.originalX;
    c.targetY = c.originalY;
    c.targetColor = c.originalColor;
  }
}

function draw() {
  background(255);
  let hovered = null;

  for (let c of circles) {
    if (c.targetX !== undefined) {
      c.x = lerp(c.x, c.targetX, 0.07);
      c.y = lerp(c.y, c.targetY, 0.07);
      c.color = lerpColor(c.color, c.targetColor, 0.07);
    }

    noStroke();
    fill(c.color);
    ellipse(c.x, c.y, c.r * 2);

    if (dist(mouseX, mouseY, c.x, c.y) < c.r) {
      hovered = c;
    }
  }

  if (hovered) {
    let label = `${hovered.apellido}\nTotal: ${nf(hovered.total, 0, 0)}`;

    if (isEliteView && hovered.eliteTotal > 0) {
      label += `\nNum. Asambleistas: ${nf(hovered.eliteTotal, 0, 0)}`;
    }

    let padding = 6;
    textSize(14);
    textAlign(LEFT, TOP);
    let lines = label.split("\n");
    let maxWidth = max(lines.map(line => textWidth(line)));
    let boxW = maxWidth + padding * 2;
    let boxH = lines.length * 18 + padding * 2;

    let tooltipOnLeft = hovered.x > width * 0.75;
    let tooltipX = tooltipOnLeft ? hovered.x - hovered.r - boxW - 5 : hovered.x + hovered.r + 5;

    fill(0, 0, 90);
    rect(tooltipX, hovered.y - boxH / 2, boxW, boxH, 4);

    fill(0, 0, 20);
    for (let i = 0; i < lines.length; i++) {
      text(lines[i], tooltipX + padding, hovered.y - boxH / 2 + padding + i * 18);
    }
  }

  // Display "ECUADOR" in the alphabetical view only
  if (!isEliteView) {
    fill(65); // Light grey but visible
    noStroke();
    textSize(45);
    textAlign(LEFT, TOP);
    text("ECUADOR", margin + 0, 10);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function triggerElite() {
  applyEliteView();
}

function triggerOriginal() {
  restoreOriginalLayout();
}
