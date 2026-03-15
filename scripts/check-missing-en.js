import fs from 'fs';
import path from 'path';

const dirs = ['./src/data/vocabulary', './src/data/vocabulary/themes'];

for (const dir of dirs) {
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    const words = data.words || [];
    let missing = 0, total = 0;
    for (const w of words) {
      let exUk = [];
      if (Array.isArray(w.examples)) exUk = w.examples;
      else if (w.examples && w.examples.uk) exUk = w.examples.uk;
      if (!exUk.length) continue;
      total++;
      const exEn = w.examples && w.examples.en ? w.examples.en : [];
      if (!exEn.length) missing++;
    }
    if (missing) console.log(`MISSING EN: ${missing}/${total}  ${f}`);
  }
}
