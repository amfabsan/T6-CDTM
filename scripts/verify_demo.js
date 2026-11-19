// Verifica el escenario de la demo sobre data/sample/employees.csv.
// Uso: node scripts/verify_demo.js
// Restricción POR PERSONA: disponibilidad >= 50 %.
// Requisitos POR EQUIPO: Azure, Cybersecurity y Java (cubiertos entre todos).
const fs = require("fs");
const path = require("path");

const MUST = ["Azure", "Cybersecurity", "Java"];
const NICE = ["Python"];
const MIN_AVAILABILITY = 50;

const csv = fs.readFileSync(path.join(__dirname, "..", "data", "sample", "employees.csv"), "utf8");
const people = csv.trim().split(/\r?\n/).slice(1).map((line) => {
  const m = line.match(/^([^,]*),([^,]*),[^,]*,[^,]*,[^,]*,(\d+),[^,]*,"(.*)"$/);
  return { id: m[1], name: m[2], availability: +m[3], skills: m[4].split(";") };
});

const eligible = (extra) =>
  people
    .filter((p) => p.availability >= MIN_AVAILABILITY)
    .map((p) => ({ ...p, skills: p.skills.concat(extra[p.id] || []) }));

const covered = (team) => MUST.filter((s) => team.some((p) => p.skills.includes(s)));
const names = (team) => team.map((p) => p.name).join(" + ");

function analyse(label, extra) {
  const pool = eligible(extra);
  const count = (p, list) => list.filter((s) => p.skills.includes(s)).length;
  const ranking = [...pool].sort((a, b) => count(b, MUST) - count(a, MUST) || count(b, NICE) - count(a, NICE));
  const top2 = ranking.slice(0, 2);
  const singles = pool.filter((p) => covered([p]).length === MUST.length);
  const pairs = [];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      if (covered([pool[i], pool[j]]).length === MUST.length) pairs.push([pool[i], pool[j]]);

  console.log(`\n== ${label} ==`);
  console.log(`Top-2 individual: ${names(top2)} -> cubre ${covered(top2).length}/3 (${covered(top2).join(", ")})`);
  console.log(`Personas que cubren las 3 solas: ${singles.length ? singles.map((p) => p.name).join(", ") : "ninguna"}`);
  console.log(`Parejas que cubren las 3: ${pairs.length ? pairs.map(names).join(" | ") : "ninguna"}`);
  return { top2, singles, pairs };
}

const before = analyse("ANTES de la nota de voz de Ana", {});
const after = analyse("DESPUÉS (Azure de Ana verificado)", { E01: ["Azure"] });

const ok =
  before.pairs.length === 0 &&
  after.singles.length === 0 &&
  after.pairs.some(([a, b]) => [a.id, b.id].sort().join() === "E01,E14") &&
  covered(after.top2).length === 2;

console.log(`\nResultado: ${ok ? "OK — el escenario de la demo se cumple" : "FALLO — revisar datos"}`);
process.exit(ok ? 0 : 1);
