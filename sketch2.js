// IMU Visualizer - Experimental
let imuData = [];
let currentIndex = 0;
let isPlaying = false;

let playBtn, resetBtn, loadBtn, clearBtn;
let dataInput, statusText;

// Brightness for movement indicator
let currentBrightness = 0;
let targetBrightness = 0;

const colors = {
    x: [255, 100, 100],
    y: [100, 200, 200],
    z: [255, 230, 100]
};

const rawData = [
    {"timestamp": "15:56:37.663", "x": 215.3125, "y": 6.8750, "z": -5.0625},
    {"timestamp": "15:56:37.795", "x": 215.3125, "y": 6.5625, "z": -0.6875},
    {"timestamp": "15:56:37.926", "x": 216.7500, "y": 6.2500, "z": 4.0000},
    {"timestamp": "15:56:38.059", "x": 215.8750, "y": 7.0000, "z": 3.6875},
    {"timestamp": "15:56:38.190", "x": 214.8125, "y": 2.3125, "z": 8.6250},
    {"timestamp": "15:56:38.321", "x": 219.5000, "y": 1.5625, "z": 5.7500},
    {"timestamp": "15:56:38.451", "x": 208.5000, "y": 5.8125, "z": 0.6250},
    {"timestamp": "15:56:38.583", "x": 213.0000, "y": 3.1250, "z": 5.0000},
    {"timestamp": "15:56:38.715", "x": 215.6250, "y": 6.4375, "z": 11.1250},
    {"timestamp": "15:56:38.848", "x": 219.3750, "y": 9.6250, "z": 1.7500},
    {"timestamp": "15:56:38.979", "x": 220.8750, "y": 7.5625, "z": 2.7500},
    {"timestamp": "15:56:39.109", "x": 231.6875, "y": 5.2500, "z": -2.0625},
    {"timestamp": "15:56:39.242", "x": 238.1250, "y": 6.6250, "z": 3.3125},
    {"timestamp": "15:56:39.373", "x": 240.5000, "y": 10.3125, "z": 8.3125},
    {"timestamp": "15:56:39.505", "x": 242.5625, "y": 20.0000, "z": 6.5625},
    {"timestamp": "15:56:39.636", "x": 242.7500, "y": 39.2500, "z": 13.1875},
    {"timestamp": "15:56:39.801", "x": 251.8750, "y": 76.9375, "z": 80.5000},
    {"timestamp": "15:56:39.932", "x": 236.9375, "y": 47.6250, "z": 22.8750},
    {"timestamp": "15:56:40.064", "x": 232.0000, "y": 3.7500, "z": -4.6875},
    {"timestamp": "15:56:40.195", "x": 219.6250, "y": 3.3750, "z": -1.1875},
    {"timestamp": "15:56:40.325", "x": 208.1875, "y": 6.2500, "z": -0.8125},
    {"timestamp": "15:56:40.457", "x": 208.5000, "y": 3.4375, "z": 2.2500},
    {"timestamp": "15:56:40.588", "x": 204.8125, "y": 2.7500, "z": 13.2500},
    {"timestamp": "15:56:40.720", "x": 205.3750, "y": 0.6250, "z": 8.2500},
    {"timestamp": "15:56:40.851", "x": 203.9375, "y": -13.7500, "z": 21.3750},
    {"timestamp": "15:56:40.982", "x": 208.0000, "y": -8.3125, "z": 7.5000}
];

function setup() {
    createCanvas(1000, 600, WEBGL);
    
    imuData = rawData;
    
    // UI
    playBtn = createButton('Play');
    playBtn.position(20, 620);
    playBtn.mousePressed(togglePlay);
    
    resetBtn = createButton('Reset');
    resetBtn.position(80, 620);
    resetBtn.mousePressed(resetView);
    
    createElement('br');
    createSpan('Paste data:').position(20, 660);
    
    dataInput = createElement('textarea');
    dataInput.position(20, 680);
    dataInput.size(400, 80);
    dataInput.attribute('placeholder', '15:56:37.663 -> X: 215.3125  Y: 6.8750  Z: -5.0625');
    
    loadBtn = createButton('Load');
    loadBtn.position(20, 770);
    loadBtn.mousePressed(parseSerialData);
    
    clearBtn = createButton('Clear');
    clearBtn.position(70, 770);
    clearBtn.mousePressed(clearSerialData);
    
    statusText = createSpan('');
    statusText.position(130, 773);
}

function togglePlay() {
    isPlaying = !isPlaying;
    playBtn.html(isPlaying ? 'Pause' : 'Play');
}

function resetView() {
    currentIndex = 0;
    isPlaying = false;
    playBtn.html('Play');
}

function draw() {
    background(30);
    
    if (imuData.length === 0) return;
    
    if (isPlaying && frameCount % 5 === 0) {
        currentIndex = (currentIndex + 1) % imuData.length;
        updateMovementBrightness();
    }
    
    // Smooth fade brightness
    currentBrightness = lerp(currentBrightness, targetBrightness, 0.1);
    targetBrightness *= 0.95; // Decay target
    
    // All 2D elements
    push();
    translate(-width/2, -height/2);
    drawInfo();
    drawGraph();          // x=20, w=167
    drawMovementIndicator(); // x=310
    pop();
    
    // Center: 3D View (between graph and indicator)
    push();
    translate(-250, -210, 0);
    scale(0.33);
    draw3D();
    pop();
}

function updateMovementBrightness() {
    if (currentIndex > 0) {
        let prev = imuData[currentIndex - 1];
        let curr = imuData[currentIndex];
        
        // Calculate total change (sum of absolute differences)
        let dx = abs(curr.x - prev.x);
        let dy = abs(curr.y - prev.y);
        let dz = abs(curr.z - prev.z);
        let totalChange = dx + dy + dz;
        
        // Map to brightness (adjust sensitivity as needed)
        targetBrightness = min(255, targetBrightness + totalChange * 2);
    }
}

function drawInfo() {
    let d = imuData[currentIndex];
    
    textSize(10);
    textAlign(LEFT);
    
    fill(colors.x[0], colors.x[1], colors.x[2]);
    text('X: ' + d.x.toFixed(1), 20, 20);
    
    fill(colors.y[0], colors.y[1], colors.y[2]);
    text('Y: ' + d.y.toFixed(1), 80, 20);
    
    fill(colors.z[0], colors.z[1], colors.z[2]);
    text('Z: ' + d.z.toFixed(1), 140, 20);
    
    fill(150);
    text('T: ' + d.timestamp, 200, 20);
    
    fill(80);
    text('[' + (currentIndex + 1) + '/' + imuData.length + ']', 290, 20);
}

function drawGraph() {
    let gx = 20;
    let gy = 30;
    let gw = 167;
    let gh = 117;
    
    // Background
    fill(40);
    noStroke();
    rect(gx, gy, gw, gh);
    
    // Grid
    stroke(60);
    strokeWeight(1);
    for (let i = 0; i <= 4; i++) {
        let y = gy + (gh / 4) * i;
        line(gx, y, gx + gw, y);
    }
    
    let spacing = gw / (imuData.length - 1);
    
    // X line
    stroke(colors.x[0], colors.x[1], colors.x[2]);
    strokeWeight(1);
    noFill();
    beginShape();
    for (let i = 0; i < imuData.length; i++) {
        vertex(gx + i * spacing, gy + map(imuData[i].x, 360, 0, 0, gh));
    }
    endShape();
    
    // Y line
    stroke(colors.y[0], colors.y[1], colors.y[2]);
    beginShape();
    for (let i = 0; i < imuData.length; i++) {
        vertex(gx + i * spacing, gy + map(imuData[i].y, 90, -90, 0, gh));
    }
    endShape();
    
    // Z line
    stroke(colors.z[0], colors.z[1], colors.z[2]);
    beginShape();
    for (let i = 0; i < imuData.length; i++) {
        vertex(gx + i * spacing, gy + map(imuData[i].z, 90, -90, 0, gh));
    }
    endShape();
    
    // Marker
    let mx = gx + currentIndex * spacing;
    stroke(255);
    strokeWeight(1);
    line(mx, gy, mx, gy + gh);
    
    // Dots
    let d = imuData[currentIndex];
    noStroke();
    fill(colors.x[0], colors.x[1], colors.x[2]);
    ellipse(mx, gy + map(d.x, 360, 0, 0, gh), 4, 4);
    fill(colors.y[0], colors.y[1], colors.y[2]);
    ellipse(mx, gy + map(d.y, 90, -90, 0, gh), 4, 4);
    fill(colors.z[0], colors.z[1], colors.z[2]);
    ellipse(mx, gy + map(d.z, 90, -90, 0, gh), 4, 4);
    
    // Legend
    textSize(9);
    fill(colors.x[0], colors.x[1], colors.x[2]);
    text('X', gx + gw + 5, gy + 10);
    fill(colors.y[0], colors.y[1], colors.y[2]);
    text('Y', gx + gw + 5, gy + 22);
    fill(colors.z[0], colors.z[1], colors.z[2]);
    text('Z', gx + gw + 5, gy + 34);
}

function drawMovementIndicator() {
    // After 3D view (rightmost)
    let bx = 380;
    let by = 30;
    let bw = 40;
    let bh = 117;
    
    noStroke();
    fill(currentBrightness);
    rect(bx, by, bw, bh);
    
    // Label
    fill(100);
    textSize(8);
    textAlign(CENTER);
    text('Move', bx + bw/2, by + bh + 12);
    text(floor(currentBrightness), bx + bw/2, by + bh/2);
}

function draw3D() {
    let d = imuData[currentIndex];
    let heading = radians(d.x);
    let roll = radians(d.y);
    let pitch = radians(d.z);
    
    ambientLight(100);
    directionalLight(255, 255, 255, 0.5, 0.5, -1);
    
    // Grid floor
    push();
    translate(0, 120, 0);
    rotateX(HALF_PI);
    stroke(50);
    strokeWeight(1);
    noFill();
    for (let i = -5; i <= 5; i++) {
        line(i * 25, -125, i * 25, 125);
        line(-125, i * 25, 125, i * 25);
    }
    pop();
    
    // World axes
    strokeWeight(3);
    stroke(255, 80, 80);
    line(0, 0, 0, 100, 0, 0);
    stroke(80, 255, 80);
    line(0, 0, 0, 0, -100, 0);
    stroke(80, 80, 255);
    line(0, 0, 0, 0, 0, 100);
    
    // Sensor
    push();
    rotateY(-heading);
    rotateZ(pitch);
    rotateX(roll);
    
    fill(70, 120, 170);
    stroke(100, 150, 200);
    strokeWeight(1);
    box(100, 25, 60);
    
    push();
    translate(0, -15, 0);
    fill(255, 80, 80);
    noStroke();
    box(20, 4, 20);
    pop();
    
    push();
    translate(60, 0, 0);
    rotateZ(-HALF_PI);
    fill(255, 200, 80);
    noStroke();
    cone(12, 25);
    pop();
    
    pop();
}

function parseSerialData() {
    let input = dataInput.value();
    
    if (!input.trim()) {
        statusText.html('No data');
        return;
    }
    
    let lines = input.trim().split('\n');
    let newData = [];
    
    for (let line of lines) {
        let match = line.match(/(\d+:\d+:\d+\.\d+)\s*->\s*X:\s*([-\d.]+)\s*Y:\s*([-\d.]+)\s*Z:\s*([-\d.]+)/);
        if (match) {
            newData.push({
                timestamp: match[1],
                x: parseFloat(match[2]),
                y: parseFloat(match[3]),
                z: parseFloat(match[4])
            });
        }
    }
    
    if (newData.length > 0) {
        imuData = newData;
        currentIndex = 0;
        isPlaying = false;
        playBtn.html('Play');
        statusText.html(newData.length + ' pts');
    } else {
        statusText.html('Invalid');
    }
}

function clearSerialData() {
    dataInput.value('');
    statusText.html('');
    imuData = rawData;
    currentIndex = 0;
    isPlaying = false;
    playBtn.html('Play');
}

function mousePressed() {
    let gx = 20;
    let gy = 50;
    let gw = 500;
    let gh = 350;
    
    if (mouseX > gx && mouseX < gx + gw && mouseY > gy && mouseY < gy + gh) {
        currentIndex = floor(map(mouseX - gx, 0, gw, 0, imuData.length));
        currentIndex = constrain(currentIndex, 0, imuData.length - 1);
    }
}

function mouseDragged() {
    mousePressed();
}

function keyPressed() {
    if (key === ' ') {
        togglePlay();
        return false;
    }
    if (keyCode === LEFT_ARROW) {
        currentIndex = max(0, currentIndex - 1);
        return false;
    }
    if (keyCode === RIGHT_ARROW) {
        currentIndex = min(imuData.length - 1, currentIndex + 1);
        return false;
    }
}
