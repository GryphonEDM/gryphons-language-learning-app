// Apply targeted fixes to sentence bank based on audit findings.
// Each fix is explicit — no heuristic deletion beyond these enumerated cases.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANK = path.resolve(__dirname, '../src/data/sentence-bank');

function load(lang) {
  return JSON.parse(fs.readFileSync(path.join(BANK, `${lang}.json`), 'utf8'));
}
function save(lang, data) {
  // recompute meta from current state
  const words = Object.keys(data.sentences);
  data.meta.wordCount = words.length;
  data.meta.sentenceCount = words.reduce((n, w) => n + data.sentences[w].length, 0);
  fs.writeFileSync(path.join(BANK, `${lang}.json`), JSON.stringify(data, null, 2));
}

const report = [];

// === RU: remove stray test entry ===
{
  const d = load('ru');
  if (d.sentences.test_word) {
    delete d.sentences.test_word;
    report.push('RU: removed stray "test_word" entry');
  }
  save('ru', d);
}

// === FR: drop {complement} template-leak entries at index 0 ===
{
  const d = load('fr');
  const words = [
    'enregistrer','cafetière','décongeler','râper','mâchoire','déterminer',
    'encourager','louer','ordonner','déjeuner','épousseter','négliger',
    "espérer/s'attendre à",'menuisier','battre (les cartes)','facture',
    'monastère',"chef-d'œuvre",'visiter',
  ];
  let removed = 0;
  for (const w of words) {
    const arr = d.sentences[w];
    if (!arr) continue;
    if (arr[0] && arr[0].s && arr[0].s.includes('{complement}')) {
      arr.splice(0, 1);
      removed++;
    }
  }
  report.push(`FR: removed ${removed} template-leak entries (now ${words.length === removed ? 'all' : removed + '/' + words.length} fixed)`);
  save('fr', d);
}

// === EL: deduplicate index 3 where 1 and 3 are identical ===
{
  const d = load('el');
  const words = ['ανανάς','μπύρα','πόδι','παπούτσια','τακούνι','επτά','βροντή','τυφώνας'];
  let removed = 0;
  for (const w of words) {
    const arr = d.sentences[w];
    if (!arr || arr.length < 4) continue;
    if (arr[1] && arr[3] && arr[1].s === arr[3].s) {
      arr.splice(3, 1);
      removed++;
    }
  }
  report.push(`EL: removed ${removed} duplicate entries`);
  save('el', d);
}

// === AR: deduplicate index 4 where 0 and 4 are identical ===
{
  const d = load('ar');
  const w = 'كَافٍ';
  const arr = d.sentences[w];
  if (arr && arr.length >= 5 && arr[0].s === arr[4].s) {
    arr.splice(4, 1);
    report.push(`AR: removed duplicate entry on "${w}"`);
  }
  save('ar', d);
}

// === JA: remove single-kanji "sentences" at index 2 ===
{
  const d = load('ja');
  const targets = ['時', '船', '鶏'];
  let removed = 0;
  for (const w of targets) {
    const arr = d.sentences[w];
    if (!arr) continue;
    if (arr[2] && arr[2].s.replace(/\s/g, '').length <= 2) {
      arr.splice(2, 1);
      removed++;
    }
  }
  report.push(`JA: removed ${removed} single-kanji stub sentences`);
  save('ja', d);
}

// === KO: remove bare-word "sentences" at index 0 ===
{
  const d = load('ko');
  const targets = ['필요', '담요'];
  let removed = 0;
  for (const w of targets) {
    const arr = d.sentences[w];
    if (!arr) continue;
    if (arr[0] && !/[.!?]/.test(arr[0].s) && arr[0].s.split(/\s+/).length === 1) {
      arr.splice(0, 1);
      removed++;
    }
  }
  report.push(`KO: removed ${removed} bare-word stub sentences`);
  save('ko', d);
}

console.log('=== Fixes applied ===');
for (const line of report) console.log(' -', line);
