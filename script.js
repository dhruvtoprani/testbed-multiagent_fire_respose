// Autonomous Fire Response System (Bandit-based Task Allocation)

const grid = document.getElementById('grid');
let fireCells = [];
const severities = ['fire-A', 'fire-B', 'fire-C'];
const fireCounts = { 'fire-A': 0, 'fire-B': 0, 'fire-C': 0 };
let fireLabelCounter = 1;

const agents = {
  agent1: { name: 'Human', capacity: 10, load: 0, damaged: 0, tasks: [], completed: [], regret: 0 },
  agent2: { name: 'Robot 1', capacity: 10, load: 0, damaged: 0, tasks: [], completed: [], regret: 0 },
  agent3: { name: 'Robot 2', capacity: 10, load: 0, damaged: 0, tasks: [], completed: [], regret: 0 }
};

const taskSpecs = {
  A: { mean: 7, variance: 2, reward: 12, duration: 12000 },
  B: { mean: 4, variance: 1.5, reward: 7, duration: 8000 },
  C: { mean: 2, variance: 1, reward: 3, duration: 5000 }
};

function buildGrid() {
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.classList.add('cell');
    grid.appendChild(div);
  }
}

function getRandomEmptyCellIndex() {
  let index, tries = 0;
  do {
    index = Math.floor(Math.random() * 100);
    tries++;
    if (tries > 200) break;
  } while (fireCells.some(f => f.index === index));
  return index;
}

function spawnFireOfSeverity(severity) {
  const index = getRandomEmptyCellIndex();
  const cell = grid.children[index];
  cell.className = 'cell';
  cell.classList.add(severity);

  const label = document.createElement('span');
  const taskNumber = fireLabelCounter++;
  label.textContent = taskNumber;
  label.style.cssText = 'font-size: 12px; color: #000; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)';

  cell.style.position = 'relative';
  cell.innerHTML = '';
  cell.appendChild(label);

  fireCells.push({ index, severity, taskNumber });
  fireCounts[severity]++;
}

function initializeFires() {
  for (let severity of severities) {
    for (let i = 0; i < 3; i++) spawnFireOfSeverity(severity);
  }
}

function completeFireAt(index) {
  const fire = fireCells.find(f => f.index === index);
  if (!fire) return;

  const cell = grid.children[index];
  cell.className = 'cell';
  cell.innerHTML = '';

  fireCells = fireCells.filter(f => f.index !== index);
  fireCounts[fire.severity]--;
  spawnFireOfSeverity(fire.severity);
}

function assignTaskToAgent(agentKey, fire, actualF, taskDuration, reward) {
  const agent = agents[agentKey];
  const totalAvailable = agent.capacity - agent.load - agent.damaged;
  const borrowed = Math.max(0, actualF - totalAvailable);
  const usedFromFleet = actualF - borrowed;

  agent.load += usedFromFleet;
  agent.tasks.push({ taskNumber: fire.taskNumber, severity: fire.severity.split('-')[1], actualF, borrowed });
  grid.children[fire.index].classList.add('in-progress');

  const damageChance = 0.15;
  const damagedDrones = Math.random() < damageChance ? Math.floor(Math.random() * 2 + 1) : 0;
  agent.damaged += damagedDrones;

  updateAgentProgress(agentKey);

  setTimeout(() => {
    agent.load -= usedFromFleet;
    agent.tasks = agent.tasks.filter(t => t.taskNumber !== fire.taskNumber);
    agent.completed.push({ taskNumber: fire.taskNumber, severity: fire.severity.split('-')[1], actualF, borrowed });

    if (damagedDrones > 0) {
      setTimeout(() => {
        agent.damaged -= damagedDrones;
        updateAgentProgress(agentKey);
      }, Math.floor(Math.random() * 4000 + 3000));
    }

    updateAgentProgress(agentKey);
    completeFireAt(fire.index);
  }, taskDuration);
}

function updateAgentProgress(agentKey) {
    const agent = agents[agentKey];
    const list = document.getElementById(agentKey + '-status');
    const recentActive = agent.tasks.slice(-5);
    const recentCompleted = agent.completed.slice(-5);
  
    if (list) {
      list.innerHTML = `
        <h4>${agent.name}</h4>
        <p><strong>Load:</strong> ${agent.load}/${agent.capacity}</p>
        <p><strong>Damaged:</strong> ${agent.damaged}</p>
        <strong>Active:</strong>
        <ul>${recentActive.map(t => `<li>#${t.taskNumber} (${t.severity}) - ${t.actualF}D${t.borrowed > 0 ? ' B+' + t.borrowed : ''}</li>`).join('')}</ul>
        <strong>Completed:</strong>
        <ul>${recentCompleted.map(t => `<li>#${t.taskNumber} (${t.severity}) ✅</li>`).join('')}</ul>`;
    }
  
    // Also update performance stats
    const statsUl = document.querySelector(`#${agentKey}-stats ul.agent-status-list`);
    if (statsUl) {
      const totalTasks = agent.completed.length;
      const avgSeverity = (agent.completed.reduce((acc, t) => acc + (t.severity === 'A' ? 3 : t.severity === 'B' ? 2 : 1), 0) / totalTasks || 0).toFixed(2);
      const avgDrones = (agent.completed.reduce((acc, t) => acc + t.actualF, 0) / totalTasks || 0).toFixed(2);
      const reward = agent.completed.reduce((acc, t) => acc + (t.severity === 'A' ? 12 : t.severity === 'B' ? 7 : 3), 0);
      const penalty = agent.completed.reduce((acc, t) => acc + t.borrowed, 0);
  
      statsUl.innerHTML = `
        <li><strong>Tasks Completed:</strong> ${totalTasks}</li>
        <li><strong>Avg Severity:</strong> ${avgSeverity}</li>
        <li><strong>Avg Drones Used:</strong> ${avgDrones}</li>
        <li><strong>Current Load:</strong> ${agent.load}</li>
        <li><strong>Damaged Drones:</strong> ${agent.damaged}</li>
        <li><strong>Total Reward:</strong> ${(reward - penalty).toFixed(1)}</li>
        <li><strong>Penalty (Borrowing):</strong> ${penalty.toFixed(1)}</li>
      `;
    }
  }
  

function assignBanditOptimizedTasks() {
  const availableFires = fireCells.filter(f =>
    !Object.values(agents).some(a => a.tasks.some(t => t.taskNumber === f.taskNumber))
  );

  for (let fire of availableFires) {
    const sev = fire.severity.split('-')[1];
  
    // Apply human preferences
    if (agents.agent1.load + agents.agent1.damaged < agents.agent1.capacity) {
      const prefers = selectedPreferences.size === 0 || selectedPreferences.has(sev);
      const preferenceBias = prefers ? 2 : -1; // reward bias
      const spec = taskSpecs[sev];
      const est = Math.max(1, Math.round(spec.mean + (Math.random() * spec.variance * 2 - spec.variance)));
      
      let bestScore = -Infinity;
      let bestAgent = null;
  
      for (let [key, agent] of Object.entries(agents)) {
        const futureLoad = agent.load + agent.damaged + est;
        const feasible = futureLoad <= agent.capacity;
        const penalty = !feasible ? 2 : 0;
        let reward = spec.reward;
  
        // Add bias only for human agent
        if (key === 'agent1') reward += preferenceBias;
  
        const score = reward / est - penalty;
  
        if (score > bestScore) {
          bestScore = score;
          bestAgent = key;
        }
      }
  
      assignTaskToAgent(bestAgent, fire, est, spec.duration, spec.reward);
    }
  }
   {
    const sev = fire.severity.split('-')[1];
    const spec = taskSpecs[sev];
    const est = Math.max(1, Math.round(spec.mean + (Math.random() * spec.variance * 2 - spec.variance)));

    let bestScore = -Infinity;
    let bestAgent = null;
    for (let [key, agent] of Object.entries(agents)) {
      const futureLoad = agent.load + agent.damaged + est;
      const feasible = futureLoad <= agent.capacity;
      const penalty = !feasible ? 2 : 0;
      const score = spec.reward / est - penalty;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = key;
      }
    }

    assignTaskToAgent(bestAgent, fire, est, spec.duration, spec.reward);
  }
}

const selectedPreferences = new Set();

document.querySelectorAll(".pref-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const sev = btn.dataset.severity;
    if (selectedPreferences.has(sev)) {
      selectedPreferences.delete(sev);
      btn.classList.remove("selected");
    } else {
      selectedPreferences.add(sev);
      btn.classList.add("selected");
    }
  });
});


buildGrid();
initializeFires();
setInterval(assignBanditOptimizedTasks, 4000);
