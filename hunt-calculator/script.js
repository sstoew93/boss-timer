const FULL_LABEL = "Full:";
const ATRIBUTOS = [
  { id: "damage",    label: "Damage",    multiplier: 120, cap: 65000 },
  { id: "defense",   label: "Defense",   multiplier: 150, cap: 65000 },
  { id: "hp",        label: "HP",        multiplier: 600, cap: 65000 },
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
    <div class="atributo-item">
      <label for="${a.id}-perc">${a.label}</label>
      <input type="number" id="${a.id}-perc" class="porcentagem" value="0" min="0" max="100">
      <span class="valor" id="${a.id}-valor">0.00</span>
      ${a.cap !== null ? `<span class="optimal" id="${a.id}-optimal"></span>` : "<span></span>"}
    </div>
  `).join("");
  document.querySelectorAll(".porcentagem").forEach(inp => inp.addEventListener("input", calcular));
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

  let total = 0;
  document.querySelectorAll(".porcentagem").forEach(inp => { total += parseFloat(inp.value) || 0; });
  const totalDisplay = document.getElementById("total-display");
  document.getElementById("total-valor").textContent = total.toFixed(0);
  totalDisplay.classList.toggle("ok", total.toFixed(0) === "100");
  totalDisplay.classList.toggle("nok", total.toFixed(0) !== "100");

  const bonusQuest = {};
  document.querySelectorAll(".quest-input").forEach(inp => {
    bonusQuest[inp.id.replace("quest-", "")] = parseFloat(inp.value) || 0;
  });

  ATRIBUTOS.forEach(a => {
    const perc = parseFloat(document.getElementById(`${a.id}-perc`).value) || 0;
    const valorSpan = document.getElementById(`${a.id}-valor`);
    const optimalSpan = document.getElementById(`${a.id}-optimal`);

    const valorNivel = nivel * (perc / 100) * a.multiplier;
    let valorFinal = valorNivel + bonusQuest[a.id];

    if (a.cap !== null && valorFinal > a.cap) {
      valorFinal = a.cap;
      valorSpan.classList.add("capped");
    } else {
      valorSpan.classList.remove("capped");
    }
    valorSpan.textContent = valorFinal.toFixed(2);

    if (a.cap !== null && optimalSpan) {
      if (nivel > 0) {
        const pontosParaCap = a.cap - bonusQuest[a.id];
        const pontosNivelNecessarios = pontosParaCap / a.multiplier;
        const percIdeal = (pontosNivelNecessarios / nivel) * 100;
        optimalSpan.textContent = `${FULL_LABEL} ${percIdeal.toFixed(2)}%`;
      } else {
        optimalSpan.textContent = `${FULL_LABEL} 0.00%`;
      }
    }
  });
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[name="quest-type"]').forEach(r => r.addEventListener("change", atualizarQuestInputs));
    document.getElementById("nivel").addEventListener("input", calcular);

    montarAtributos();
    montarQuestInputs();
    atualizarQuestInputs();
});
