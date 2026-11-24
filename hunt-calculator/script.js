const FULL_LABEL = "Full:";
const ATRIBUTOS = [
  { id: "damage",    label: "Damage",    multiplier: 120, cap: 65000 },
  { id: "defense",   label: "Defense",   multiplier: 150, cap: 65000 },
  { id: "hp",        label: "Health",    multiplier: 600, cap: 65000 },
  { id: "mana",      label: "Mana",      multiplier: 600, cap: 65000 },
  { id: "wizardry",  label: "Wizardry",  multiplier: 200, cap: 65000 },
  { id: "recovery",  label: "Recovery",  multiplier: 0.3, cap: null },
  { id: "critical",  label: "Critical",  multiplier: 0.6, cap: null },
  { id: "excellent", label: "Excellent", multiplier: 0.6, cap: null },
];

const QUESTS = {
  damage:   { damage: 21200, defense: 2100, hp: 11850, mana: 0,    wizardry: 0,     recovery: 0, critical: 3, excellent: 3 },
  wizardry: { damage: 0,     defense: 2100, hp: 10850, mana: 5500, wizardry: 14000, recovery: 0, critical: 2, excellent: 11 },
  custom:   { damage: 0, defense: 0, hp: 0, mana: 0, wizardry: 0, recovery: 0, critical: 0, excellent: 0 },
};

function montarAtributos() {
  const grid = document.getElementById("atributos-grid");
  grid.innerHTML = ATRIBUTOS.map(a => `
    <div class="atributo-row">
        <div class="attr-left">
            <div class="progress-track">
                <div class="progress-fill" id="bar-${a.id}"></div>
            </div>
            <input type="number" id="${a.id}-perc" class="perc-input" value="0" min="0" max="100" step="0.1">
            <span class="perc-sign">%</span>
        </div>
        <div class="attr-right">
            <span class="attr-label">${a.label}:</span>
            <span class="attr-base" id="${a.id}-base">0</span>
            <span class="attr-bonus" id="${a.id}-bonus"></span>
            <div class="tooltip-container">
                <span class="tooltip-icon">?</span>
                <div class="tooltip-text" id="${a.id}-tooltip"></div>
            </div>
        </div>
    </div>
  `).join("");
  document.querySelectorAll(".perc-input").forEach(inp => inp.addEventListener("input", calcular));
}

function montarQuestInputs() {
  const grid = document.getElementById("quest-grid");
  grid.innerHTML = ATRIBUTOS.map(a => `
    <div class="form-row">
      <label for="quest-${a.id}">${a.label}</label>
      <input type="number" id="quest-${a.id}" class="quest-input" value="0" min="0" step="1">
    </div>
  `).join("");
  document.querySelectorAll(".quest-input").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const tipo = document.querySelector('input[name="quest-type"]:checked').value;
      if (tipo === "custom") {
        const id = e.target.id.replace("quest-", "");
        QUESTS.custom[id] = parseFloat(e.target.value) || 0;
        calcular();
      }
    });
  });
}

function atualizarQuestInputs() {
  const tipo = document.querySelector('input[name="quest-type"]:checked').value;
  const isCustom = tipo === "custom";
  const valores = QUESTS[tipo];
  document.querySelectorAll(".quest-input").forEach(inp => {
    const id = inp.id.replace("quest-", "");
    inp.value = valores[id];
    inp.disabled = !isCustom;
  });
  calcular();
}

function calcular() {
  const nivel = parseFloat(document.getElementById("nivel").value) || 0;

  // Calculate Total Percentage
  let total = 0;
  document.querySelectorAll(".perc-input").forEach(inp => { total += parseFloat(inp.value) || 0; });
  const totalDisplay = document.getElementById("total-display");
  document.getElementById("total-valor").textContent = total.toFixed(1); // .1 shows decimals nicely
  totalDisplay.classList.toggle("ok", total.toFixed(0) === "100");
  totalDisplay.classList.toggle("nok", total.toFixed(0) !== "100");

  // Get Quest Values
  const bonusQuest = {};
  document.querySelectorAll(".quest-input").forEach(inp => {
    bonusQuest[inp.id.replace("quest-", "")] = parseFloat(inp.value) || 0;
  });

  // Update each row
  ATRIBUTOS.forEach(a => {
    const percInput = document.getElementById(`${a.id}-perc`);
    const perc = parseFloat(percInput.value) || 0;
    
    const barEl = document.getElementById(`bar-${a.id}`);
    const baseEl = document.getElementById(`${a.id}-base`);
    const bonusEl = document.getElementById(`${a.id}-bonus`);
    const tooltipEl = document.getElementById(`${a.id}-tooltip`);

    // Update Progress Bar width (0 to 100%)
    barEl.style.width = `${Math.min(perc, 100)}%`;

    // Math
    const valorNivel = nivel * (perc / 100) * a.multiplier;
    let valorFinal = valorNivel + bonusQuest[a.id];
    
    // Cap logic
    if (a.cap !== null && valorFinal > a.cap) {
      valorFinal = a.cap;
      baseEl.style.color = "#ef4444"; // Turn red if capped
    } else {
      baseEl.style.color = "#e4e4e7"; // Normal white
    }

    // Update Text Values
    baseEl.textContent = Math.round(valorNivel).toLocaleString('en-US');
    const questBonus = bonusQuest[a.id];
    bonusEl.textContent = questBonus > 0 ? `+${questBonus.toLocaleString('en-US')}` : "";

    // Update Tooltip
    let tooltipHTML = `Total: <strong>${Math.round(valorFinal).toLocaleString('en-US')}</strong>`;
    if (a.cap !== null) {
        if (valorFinal >= a.cap) tooltipHTML += `<br><span style="color:#ef4444">Capped at ${a.cap.toLocaleString('en-US')}</span>`;
        
        if (nivel > 0) {
            const pontosParaCap = a.cap - questBonus;
            const pontosNivelNecessarios = pontosParaCap / a.multiplier;
            const percIdeal = (pontosNivelNecessarios / nivel) * 100;
            tooltipHTML += `<br>${FULL_LABEL} ${percIdeal.toFixed(2)}%`;
        }
    }
    tooltipEl.innerHTML = tooltipHTML;
  });
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[name="quest-type"]').forEach(r => r.addEventListener("change", atualizarQuestInputs));
    document.getElementById("nivel").addEventListener("input", calcular);

    montarAtributos();
    montarQuestInputs();
    atualizarQuestInputs();
});
