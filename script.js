let targets = [];
let selectedCell = null;
let totalError = 0;
let rounds = 0;
let startTime = null;
let totalTime = 0;
let attempts = [];
let isPracticeMode = true;
let isGridlessMode = false;
let showHints = false;
let svg = null;
let timerInterval = null;

function calculateDifficulty(size, targetCount) {
    const difficultyScore = (size * targetCount) / 10;
    if (difficultyScore <= 5) return { level: 'easy', color: '#90EE90' };
    if (difficultyScore <= 10) return { level: 'medium', color: '#FFD700' };
    if (difficultyScore <= 15) return { level: 'hard', color: '#FFA07A' };
    return { level: 'extreme', color: '#FF6B6B' };
}

function updateDifficultyBadge() {
    const size = parseInt(document.getElementById('customSize').value);
    const targetCount = parseInt(document.getElementById('targetCount').value);
    const difficulty = calculateDifficulty(size, targetCount);
    
    const badge = document.getElementById('difficultyRating');
    badge.textContent = `Difficulty: ${difficulty.level.toUpperCase()}`;
    badge.className = `difficulty-badge ${difficulty.level}`;
}

function createSVGOverlay(containerWidth, containerHeight) {
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    overlay.setAttribute("class", "grid-overlay");
    overlay.setAttribute("width", containerWidth);
    overlay.setAttribute("height", containerHeight);
    return overlay;
}

function showDistanceLines(cellSize, size) {
    if (!showHints) return;

    const container = document.querySelector('.grid-container');
    if (svg) container.removeChild(svg);
    
    svg = createSVGOverlay(container.offsetWidth, container.offsetHeight);
    container.appendChild(svg);

    const gridOffset = document.querySelector('.grid').getBoundingClientRect();
    const containerOffset = container.getBoundingClientRect();
    const offsetX = gridOffset.left - containerOffset.left;
    const offsetY = gridOffset.top - containerOffset.top;

    targets.forEach(target => {
        const targetX = (target % size) * cellSize + cellSize/2 + offsetX + 2;
        const targetY = Math.floor(target / size) * cellSize + cellSize/2 + offsetY + 2;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", targetX);
        circle.setAttribute("cy", targetY);
        circle.setAttribute("r", cellSize * 2);
        circle.setAttribute("class", "hint-line");
        circle.setAttribute("fill", "none");
        svg.appendChild(circle);
    });

    const optimalIndex = findOptimalPoint(size);
    const optimalX = (optimalIndex % size) * cellSize + cellSize/2 + offsetX + 2;
    const optimalY = Math.floor(optimalIndex / size) * cellSize + cellSize/2 + offsetY + 2;

    const centroidHint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    centroidHint.setAttribute("cx", optimalX);
    centroidHint.setAttribute("cy", optimalY);
    centroidHint.setAttribute("r", cellSize);
    centroidHint.setAttribute("class", "hint-line");
    centroidHint.setAttribute("stroke", "#4CAF50");
    centroidHint.setAttribute("fill", "none");
    svg.appendChild(centroidHint);

    const hintText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    hintText.setAttribute("x", optimalX);
    hintText.setAttribute("y", optimalY - cellSize - 5);
    hintText.setAttribute("text-anchor", "middle");
    hintText.setAttribute("class", "distance-label");
    hintText.textContent = "Optimal point area";
    svg.appendChild(hintText);
}

function handleModeChange() {
    const selectedMode = document.querySelector('input[name="mode"]:checked').value;
    isPracticeMode = selectedMode === 'practice';
    isGridlessMode = selectedMode === 'gridless';
    showHints = document.getElementById('showHints').checked && isPracticeMode;
    startGame();
}

function setupEventListeners() {
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', handleModeChange);
    });

    document.getElementById('showHints').addEventListener('change', function() {
        showHints = this.checked && isPracticeMode;
        if (showHints) {
            showDistanceLines(30, parseInt(document.getElementById('customSize').value));
        } else if (svg) {
            svg.innerHTML = '';
        }
    });

    document.getElementById('customSize').addEventListener('input', updateDifficultyBadge);
    document.getElementById('targetCount').addEventListener('change', updateDifficultyBadge);
}

function createGrid(size) {
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `repeat(${size}, 30px)`;
    grid.innerHTML = '';
    
    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (isGridlessMode) {
            cell.classList.add('gridless');
        }
        cell.dataset.index = i;
        cell.onclick = () => handleCellClick(i);
        grid.appendChild(cell);
    }
}

function startGame() {
    const size = parseInt(document.getElementById('customSize').value);
    const targetCount = parseInt(document.getElementById('targetCount').value);
    
    updateDifficultyBadge();
    createGrid(size);
    generateTargets(size, targetCount);
    
    totalError = 0;
    totalTime = 0;
    rounds = 0;
    attempts = [];
    updateScore();
    startRound();

    if (showHints) {
        showDistanceLines(30, size);
    }
}

function startRound() {
    startTime = Date.now();
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    updateTimer();
    timerInterval = setInterval(updateTimer, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000;
        document.getElementById('timer').textContent = elapsed.toFixed(1);
    }
}

function generateTargets(size, count) {
    const cells = document.getElementsByClassName('cell');
    targets = [];
    
    Array.from(cells).forEach(cell => {
        cell.classList.remove('target');
        cell.classList.remove('selected');
        cell.classList.remove('optimal');
    });

    while (targets.length < count) {
        const randomIndex = Math.floor(Math.random() * (size * size));
        if (!targets.includes(randomIndex)) {
            targets.push(randomIndex);
            cells[randomIndex].classList.add('target');
        }
    }
}

function findOptimalPoint(size) {
    let sumX = 0, sumY = 0;
    targets.forEach(target => {
        sumX += target % size;
        sumY += Math.floor(target / size);
    });
    
    const avgX = Math.round(sumX / targets.length);
    const avgY = Math.round(sumY / targets.length);
    
    return avgY * size + avgX;
}

function calculateDistance(index1, index2, size) {
    const row1 = Math.floor(index1 / size);
    const col1 = index1 % size;
    const row2 = Math.floor(index2 / size);
    const col2 = index2 % size;
    
    return Math.sqrt(Math.pow(row1 - row2, 2) + Math.pow(col1 - col2, 2));
}

function handleCellClick(index) {
    stopTimer();
    const timeSpent = (Date.now() - startTime) / 1000;
    document.getElementById('timer').textContent = timeSpent.toFixed(1);
    
    const cells = document.getElementsByClassName('cell');
    const size = parseInt(document.getElementById('customSize').value);
    
    if (selectedCell !== null) {
        cells[selectedCell].classList.remove('selected');
    }
    
    cells[index].classList.add('selected');
    selectedCell = index;
    
    const optimalIndex = findOptimalPoint(size);
    cells[optimalIndex].classList.add('optimal');
    
    let totalDistance = 0;
    targets.forEach(target => {
        totalDistance += calculateDistance(index, target, size);
    });
    
    const averageDistance = totalDistance / targets.length;
    const optimalDistance = calculateDistance(index, optimalIndex, size);
    
    totalError += averageDistance;
    totalTime += timeSpent;
    rounds++;

    attempts.unshift({
        round: rounds,
        time: timeSpent.toFixed(1),
        error: averageDistance.toFixed(2),
        optimalDistance: optimalDistance.toFixed(2)
    });

    updateScore();
    updateAttemptList();
    
    const delay = isPracticeMode ? 1500 : 1000;
    setTimeout(() => {
        const targetCount = parseInt(document.getElementById('targetCount').value);
        generateTargets(size, targetCount);
        startRound();
        if (showHints) {
            showDistanceLines(30, size);
        }
    }, delay);
}

function updateScore() {
    const scoreElement = document.getElementById('score');
    const avgTimeElement = document.getElementById('avgTime');
    
    if (rounds === 0) {
        scoreElement.textContent = '0';
        avgTimeElement.textContent = '0.0';
    } else {
        scoreElement.textContent = (totalError / rounds).toFixed(2);
        avgTimeElement.textContent = (totalTime / rounds).toFixed(1);
    }
}

function updateAttemptList() {
    const list = document.getElementById('attemptList');
    list.innerHTML = attempts.slice(0, 10).map(attempt => `
        <div class="attempt">
            Round ${attempt.round}:<br>
            Time: ${attempt.time}s<br>
            Avg Distance to Targets: ${attempt.error} cells<br>
            Distance from Optimal: ${attempt.optimalDistance} cells
        </div>
    `).join('');
}

window.onload = () => {
    setupEventListeners();
    startGame();
};
