// Multi-Section IMU Visualizer
let sections = [];
let sectionCounter = 0;

const colors = {
    x: [255, 100, 100],
    y: [100, 200, 200],
    z: [255, 230, 100]
};

const defaultData = [
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
    noCanvas();
    initExistingSections();
    setupAddButton();
}

function initExistingSections() {
    document.querySelectorAll('.viz-section').forEach(el => {
        let id = parseInt(el.dataset.sectionId);
        createSectionInstance(el, id);
        sectionCounter = Math.max(sectionCounter, id + 1);
    });
}

function createSectionInstance(element, id) {
    let container = element.querySelector('.canvas-container');
    let p5Instance = new p5(sketch => sectionSketch(sketch, id), container);
    
    let section = {
        id: id,
        element: element,
        p5: p5Instance,
        data: JSON.parse(JSON.stringify(defaultData)),
        currentIndex: 0,
        isPlaying: false,
        currentBrightness: 0,
        targetBrightness: 0,
        brightnessHistory: [],
        currentPage: 0, // 0: main, 1: heatmap
        heatmapInstances: {}
    };
    
    sections.push(section);
    bindSectionEvents(section);
    updateSectionDisplay(section);
}

function sectionSketch(p, sectionId) {
    p.setup = function() {
        p.createCanvas(520, 320, p.WEBGL);
    };
    
    p.draw = function() {
        let section = sections.find(s => s.id === sectionId);
        if (!section || section.data.length === 0) return;
        
        // Smooth fade brightness (slower lerp = smoother)
        section.currentBrightness = p.lerp(section.currentBrightness, section.targetBrightness, 0.06);
        section.targetBrightness *= 0.85;
        
        // Record brightness history (every 3 frames for slower progress)
        if (p.frameCount % 3 === 0) {
            section.brightnessHistory.push(section.currentBrightness);
            if (section.brightnessHistory.length > 400) {
                section.brightnessHistory.shift();
            }
        }
        
        // Update section element background color
        let brightness = Math.floor(section.currentBrightness * 0.6);
        section.element.style.backgroundColor = `rgb(${brightness}, ${brightness}, ${brightness})`;
        
        // Canvas background
        p.background(0);
        
        if (section.isPlaying && p.frameCount % 5 === 0) {
            let prevIndex = section.currentIndex;
            section.currentIndex = (section.currentIndex + 1) % section.data.length;
            updateMovementBrightness(section, prevIndex);
            updateSectionDisplay(section);
        }
        
        p.push();
        p.translate(-p.width/2, -p.height/2);
        drawGraph(p, section);
        p.pop();
        
        p.push();
        p.translate(140, 0, 0);
        draw3D(p, section);
        p.pop();
        
        p.push();
        p.translate(-p.width/2, -p.height/2);
        drawBrightnessGraph(p, section);
        p.pop();
    };
}

function updateMovementBrightness(section, prevIndex) {
    let prev = section.data[prevIndex];
    let curr = section.data[section.currentIndex];
    
    let dx = Math.abs(curr.x - prev.x);
    let dy = Math.abs(curr.y - prev.y);
    let dz = Math.abs(curr.z - prev.z);
    let totalChange = dx + dy + dz;
    
    // Ignore small changes (noise/tremor threshold)
    let threshold = 30;
    if (totalChange > threshold) {
        section.targetBrightness = Math.min(255, section.targetBrightness + (totalChange - threshold) * 5);
    }
}

function drawGraph(p, section) {
    let gx = 15;
    let gy = 15;
    let gw = 250;
    let gh = 170;
    
    p.fill(40);
    p.noStroke();
    p.rect(gx, gy, gw, gh);
    
    p.stroke(60);
    p.strokeWeight(1);
    for (let i = 0; i <= 4; i++) {
        let y = gy + (gh / 4) * i;
        p.line(gx, y, gx + gw, y);
    }
    
    let spacing = gw / (section.data.length - 1);
    
    p.stroke(colors.x[0], colors.x[1], colors.x[2]);
    p.strokeWeight(1.5);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < section.data.length; i++) {
        p.vertex(gx + i * spacing, gy + p.map(section.data[i].x, 360, 0, 0, gh));
    }
    p.endShape();
    
    p.stroke(colors.y[0], colors.y[1], colors.y[2]);
    p.beginShape();
    for (let i = 0; i < section.data.length; i++) {
        p.vertex(gx + i * spacing, gy + p.map(section.data[i].y, 90, -90, 0, gh));
    }
    p.endShape();
    
    p.stroke(colors.z[0], colors.z[1], colors.z[2]);
    p.beginShape();
    for (let i = 0; i < section.data.length; i++) {
        p.vertex(gx + i * spacing, gy + p.map(section.data[i].z, 90, -90, 0, gh));
    }
    p.endShape();
    
    let mx = gx + section.currentIndex * spacing;
    p.stroke(255);
    p.strokeWeight(1);
    p.line(mx, gy, mx, gy + gh);
    
    let d = section.data[section.currentIndex];
    p.noStroke();
    p.fill(colors.x[0], colors.x[1], colors.x[2]);
    p.ellipse(mx, gy + p.map(d.x, 360, 0, 0, gh), 6, 6);
    p.fill(colors.y[0], colors.y[1], colors.y[2]);
    p.ellipse(mx, gy + p.map(d.y, 90, -90, 0, gh), 6, 6);
    p.fill(colors.z[0], colors.z[1], colors.z[2]);
    p.ellipse(mx, gy + p.map(d.z, 90, -90, 0, gh), 6, 6);
}

function draw3D(p, section) {
    let d = section.data[section.currentIndex];
    let heading = p.radians(d.x);
    let roll = p.radians(d.y);
    let pitch = p.radians(d.z);
    
    p.ambientLight(100);
    p.directionalLight(255, 255, 255, 0.5, 0.5, -1);
    
    p.push();
    p.translate(0, 60, 0);
    p.rotateX(p.HALF_PI);
    p.stroke(50);
    p.strokeWeight(1);
    p.noFill();
    for (let i = -3; i <= 3; i++) {
        p.line(i * 20, -60, i * 20, 60);
        p.line(-60, i * 20, 60, i * 20);
    }
    p.pop();
    
    p.strokeWeight(2);
    p.stroke(255, 80, 80);
    p.line(0, 0, 0, 50, 0, 0);
    p.stroke(80, 255, 80);
    p.line(0, 0, 0, 0, -50, 0);
    p.stroke(80, 80, 255);
    p.line(0, 0, 0, 0, 0, 50);
    
    p.push();
    p.rotateY(-heading);
    p.rotateZ(pitch);
    p.rotateX(roll);
    
    p.fill(70, 120, 170);
    p.stroke(100, 150, 200);
    p.strokeWeight(1);
    p.box(50, 12, 30);
    
    p.push();
    p.translate(0, -8, 0);
    p.fill(255, 80, 80);
    p.noStroke();
    p.box(10, 2, 10);
    p.pop();
    
    p.push();
    p.translate(30, 0, 0);
    p.rotateZ(-p.HALF_PI);
    p.fill(255, 200, 80);
    p.noStroke();
    p.cone(6, 12);
    p.pop();
    
    p.pop();
}

function drawBrightnessGraph(p, section) {
    let gx = 280;
    let gy = 200;
    let gw = 220;
    let gh = 100;
    
    // Background
    p.fill(40);
    p.noStroke();
    p.rect(gx, gy, gw, gh);
    
    // Grid
    p.stroke(60);
    p.strokeWeight(1);
    for (let i = 0; i <= 4; i++) {
        let y = gy + (gh / 4) * i;
        p.line(gx, y, gx + gw, y);
    }
    
    // Brightness line
    if (section.brightnessHistory.length > 1) {
        p.stroke(100, 255, 150);
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        for (let i = 0; i < section.brightnessHistory.length; i++) {
            let x = p.map(i, 0, section.brightnessHistory.length - 1, gx, gx + gw);
            let y = p.map(section.brightnessHistory[i], 0, 255, gy + gh, gy);
            p.vertex(x, y);
        }
        p.endShape();
    }
    
    // Current brightness indicator
    if (section.brightnessHistory.length > 0) {
        let lastBrightness = section.brightnessHistory[section.brightnessHistory.length - 1];
        let y = p.map(lastBrightness, 0, 255, gy + gh, gy);
        p.fill(100, 255, 150);
        p.noStroke();
        p.ellipse(gx + gw, y, 8, 8);
    }
    
    // Label
    p.fill(150);
    p.textSize(10);
    p.textAlign(p.LEFT);
    p.text('Brightness', gx, gy - 3);
}

function bindSectionEvents(section) {
    let el = section.element;
    
    // Page navigation
    el.querySelector('.nav-prev').addEventListener('click', () => {
        if (section.currentPage > 0) {
            section.currentPage--;
            updateSectionPage(section);
        }
    });
    
    el.querySelector('.nav-next').addEventListener('click', () => {
        if (section.currentPage < 1) {
            section.currentPage++;
            updateSectionPage(section);
        }
    });
    
    el.querySelector('.play-btn').addEventListener('click', () => {
        section.isPlaying = !section.isPlaying;
        el.querySelector('.play-btn').textContent = section.isPlaying ? 'Pause' : 'Play';
    });
    
    el.querySelector('.reset-btn').addEventListener('click', () => {
        section.currentIndex = 0;
        section.isPlaying = false;
        el.querySelector('.play-btn').textContent = 'Play';
        updateSectionDisplay(section);
    });
    
    el.querySelector('.collapse-btn').addEventListener('click', function() {
        let content = el.querySelector('.section-content');
        if (content.classList.contains('collapsed')) {
            content.classList.remove('collapsed');
            this.textContent = '-';
        } else {
            content.classList.add('collapsed');
            this.textContent = '+';
        }
    });
    
    el.querySelector('.delete-btn').addEventListener('click', () => {
        if (sections.length > 1) {
            section.p5.remove();
            sections = sections.filter(s => s.id !== section.id);
            el.remove();
        }
    });
    
    el.querySelector('.parse-btn').addEventListener('click', () => {
        parseData(section);
    });
    
    el.querySelector('.clear-btn').addEventListener('click', () => {
        clearData(section);
    });
}

function updateSectionDisplay(section) {
    let d = section.data[section.currentIndex];
    let el = section.element;
    
    el.querySelector('.valX').textContent = d.x.toFixed(2);
    el.querySelector('.valY').textContent = d.y.toFixed(2);
    el.querySelector('.valZ').textContent = d.z.toFixed(2);
    el.querySelector('.valTime').textContent = d.timestamp;
}

function parseData(section) {
    let el = section.element;
    let textarea = el.querySelector('.serial-data');
    let status = el.querySelector('.parse-status');
    
    if (!textarea.value.trim()) {
        status.textContent = 'No data entered';
        return;
    }
    
    let lines = textarea.value.trim().split('\n');
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
        section.data = newData;
        section.currentIndex = 0;
        section.isPlaying = false;
        el.querySelector('.play-btn').textContent = 'Play';
        updateSectionDisplay(section);
        status.textContent = newData.length + ' points loaded';
    } else {
        status.textContent = 'No valid data found';
    }
}

function clearData(section) {
    let el = section.element;
    el.querySelector('.serial-data').value = '';
    el.querySelector('.parse-status').textContent = '';
    
    section.data = JSON.parse(JSON.stringify(defaultData));
    section.currentIndex = 0;
    section.isPlaying = false;
    el.querySelector('.play-btn').textContent = 'Play';
    updateSectionDisplay(section);
}

function setupAddButton() {
    document.querySelector('.add-section-btn').addEventListener('click', addNewSection);
}

function addNewSection() {
    let grid = document.getElementById('sections-grid');
    let addSlot = document.querySelector('.add-section-slot');
    
    let html = `
        <section class="viz-section" data-section-id="${sectionCounter}">
            <div class="section-header">
                <input type="text" class="section-title" value="Section ${sectionCounter + 1}" placeholder="Section Title">
                <div class="header-buttons">
                    <button class="delete-btn">x</button>
                    <button class="collapse-btn">-</button>
                </div>
            </div>
            <div class="section-content">
                <!-- Section Page Navigation -->
                <div class="section-page-nav">
                    <button class="section-nav-btn nav-prev" disabled>◀</button>
                    <span class="section-page-indicator">Main</span>
                    <button class="section-nav-btn nav-next">▶</button>
                </div>
                
                <!-- Page 0: Main View -->
                <div class="section-page main-view active">
                    <div class="controls">
                        <button class="play-btn">Play</button>
                        <button class="reset-btn">Reset</button>
                    </div>
                    <div class="info-display">
                        <div class="value-box vx">X: <span class="valX">--</span></div>
                        <div class="value-box vy">Y: <span class="valY">--</span></div>
                        <div class="value-box vz">Z: <span class="valZ">--</span></div>
                        <div class="value-box vt">T: <span class="valTime">--</span></div>
                    </div>
                    <div class="canvas-container"></div>
                    <div class="legend">
                        <span><span class="legend-color" style="background:#ff6464;"></span>X</span>
                        <span><span class="legend-color" style="background:#64c8c8;"></span>Y</span>
                        <span><span class="legend-color" style="background:#ffe664;"></span>Z</span>
                    </div>
                    <div class="data-input">
                        <h4>Paste Serial Data</h4>
                        <textarea class="serial-data" placeholder="15:56:37.663 -> X: 215.3125Y: 6.8750Z: -5.0625"></textarea>
                        <div class="input-buttons">
                            <button class="parse-btn">Load Data</button>
                            <button class="clear-btn">Clear</button>
                        </div>
                        <div class="parse-status"></div>
                    </div>
                </div>
                
                <!-- Page 1: Heatmap View -->
                <div class="section-page heatmap-view">
                    <div class="heatmap-grid">
                        <div class="heatmap-panel" data-axis="x">
                            <h4>X Axis</h4>
                            <div class="heatmap-canvas"></div>
                            <div class="heatmap-legend"><span class="hm-min">-</span><div class="hm-gradient"></div><span class="hm-max">-</span></div>
                        </div>
                        <div class="heatmap-panel" data-axis="y">
                            <h4>Y Axis</h4>
                            <div class="heatmap-canvas"></div>
                            <div class="heatmap-legend"><span class="hm-min">-</span><div class="hm-gradient"></div><span class="hm-max">-</span></div>
                        </div>
                        <div class="heatmap-panel" data-axis="z">
                            <h4>Z Axis</h4>
                            <div class="heatmap-canvas"></div>
                            <div class="heatmap-legend"><span class="hm-min">-</span><div class="hm-gradient"></div><span class="hm-max">-</span></div>
                        </div>
                        <div class="heatmap-panel" data-axis="xyz">
                            <h4>XYZ Magnitude</h4>
                            <div class="heatmap-canvas"></div>
                            <div class="heatmap-legend"><span class="hm-min">-</span><div class="hm-gradient"></div><span class="hm-max">-</span></div>
                        </div>
                    </div>
                    <div class="heatmap-tooltip"></div>
                </div>
            </div>
        </section>
    `;
    
    addSlot.insertAdjacentHTML('beforebegin', html);
    
    let newEl = grid.querySelector(`[data-section-id="${sectionCounter}"]`);
    createSectionInstance(newEl, sectionCounter);
    sectionCounter++;
}

// Section Page Navigation
function updateSectionPage(section) {
    let el = section.element;
    let mainView = el.querySelector('.main-view');
    let heatmapView = el.querySelector('.heatmap-view');
    let navPrev = el.querySelector('.nav-prev');
    let navNext = el.querySelector('.nav-next');
    let indicator = el.querySelector('.section-page-indicator');
    
    if (section.currentPage === 0) {
        mainView.classList.add('active');
        heatmapView.classList.remove('active');
        navPrev.disabled = true;
        navNext.disabled = false;
        indicator.textContent = 'Main';
    } else {
        mainView.classList.remove('active');
        heatmapView.classList.add('active');
        navPrev.disabled = false;
        navNext.disabled = true;
        indicator.textContent = 'Heatmap';
        
        // Initialize heatmaps for this section
        initSectionHeatmaps(section);
    }
}

// Heatmap Functions for Section
function initSectionHeatmaps(section) {
    let el = section.element;
    let data = section.data;
    
    // Clear existing heatmap instances
    Object.values(section.heatmapInstances).forEach(instance => {
        if (instance && instance.remove) instance.remove();
    });
    section.heatmapInstances = {};
    
    // Create heatmaps for X, Y, Z, and XYZ
    ['x', 'y', 'z', 'xyz'].forEach(axis => {
        let panel = el.querySelector(`.heatmap-panel[data-axis="${axis}"]`);
        let container = panel.querySelector('.heatmap-canvas');
        container.innerHTML = '';
        
        let tooltipEl = el.querySelector('.heatmap-tooltip');
        let p5Instance = new p5(sketch => heatmapSketch(sketch, data, axis, tooltipEl), container);
        section.heatmapInstances[axis] = p5Instance;
        
        // Update legend
        let values;
        if (axis === 'xyz') {
            values = data.map(d => Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z));
        } else {
            values = data.map(d => d[axis]);
        }
        let minVal = Math.min(...values).toFixed(1);
        let maxVal = Math.max(...values).toFixed(1);
        panel.querySelector('.hm-min').textContent = minVal;
        panel.querySelector('.hm-max').textContent = maxVal;
    });
}

function heatmapSketch(p, data, axis, tooltipEl) {
    let cellSize = 12;
    let cols = Math.ceil(Math.sqrt(data.length * 1.5));
    let rows = Math.ceil(data.length / cols);
    let offsetX = 20;
    let offsetY = 15;
    let canvasWidth = cols * cellSize + offsetX + 10;
    let canvasHeight = rows * cellSize + offsetY + 10;
    
    // Calculate min/max for this axis
    let values = [];
    if (axis === 'xyz') {
        values = data.map(d => Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z));
    } else {
        values = data.map(d => d[axis]);
    }
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    
    p.setup = function() {
        p.createCanvas(canvasWidth, canvasHeight);
        p.noLoop();
    };
    
    p.draw = function() {
        p.background(0);
        
        // Draw heatmap cells
        for (let i = 0; i < data.length; i++) {
            let col = i % cols;
            let row = Math.floor(i / cols);
            let x = offsetX + col * cellSize;
            let y = offsetY + row * cellSize;
            
            let value;
            if (axis === 'xyz') {
                value = Math.sqrt(data[i].x * data[i].x + data[i].y * data[i].y + data[i].z * data[i].z);
            } else {
                value = data[i][axis];
            }
            
            let color = valueToColor(p, value, minVal, maxVal);
            
            p.fill(color);
            p.stroke(20);
            p.strokeWeight(1);
            p.rect(x, y, cellSize - 1, cellSize - 1);
        }
        
        // Row labels
        p.fill(80);
        p.textSize(7);
        p.textAlign(p.RIGHT);
        for (let row = 0; row < rows; row += 2) {
            let frameStart = row * cols;
            if (frameStart < data.length) {
                p.text(frameStart, offsetX - 2, offsetY + row * cellSize + cellSize - 2);
            }
        }
    };
    
    p.mouseMoved = function() {
        let col = Math.floor((p.mouseX - offsetX) / cellSize);
        let row = Math.floor((p.mouseY - offsetY) / cellSize);
        let index = row * cols + col;
        
        if (index >= 0 && index < data.length && col >= 0 && col < cols && row >= 0 && row < rows) {
            let d = data[index];
            let value;
            if (axis === 'xyz') {
                value = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z).toFixed(2);
            } else {
                value = d[axis].toFixed(2);
            }
            tooltipEl.textContent = `Frame ${index} | ${d.timestamp} | ${axis.toUpperCase()}: ${value}`;
        }
    };
}

function valueToColor(p, value, minVal, maxVal) {
    let range = maxVal - minVal;
    if (range === 0) range = 1;
    let normalized = (value - minVal) / range;
    
    let r, g, b;
    
    if (normalized < 0.5) {
        let t = normalized * 2;
        r = p.lerp(30, 255, t);
        g = p.lerp(58, 255, t);
        b = p.lerp(138, 255, t);
    } else {
        let t = (normalized - 0.5) * 2;
        r = p.lerp(255, 127, t);
        g = p.lerp(255, 29, t);
        b = p.lerp(255, 29, t);
    }
    
    return p.color(r, g, b);
}
