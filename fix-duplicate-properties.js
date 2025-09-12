const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/[locale]/(onboarding)/owner/page.tsx');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf8');

// Remplacer les propriétés backgroundColor dupliquées
content = content.replace(
  /backgroundColor:\s*finalColors\.card,\s*\n\s*backgroundColor:\s*`finalColors\.card`,/g,
  'backgroundColor: finalColors.card,'
);

// Remplacer les autres propriétés dupliquées similaires
content = content.replace(
  /backgroundColor:\s*`finalColors\.card`,\s*\n\s*backgroundColor:\s*finalColors\.card,/g,
  'backgroundColor: finalColors.card,'
);

// Écrire le fichier modifié
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Propriétés dupliquées corrigées');
