const fs = require('fs');
const path = require('path');

const files = [
  'src/components/CommandDashboard.tsx',
  'src/components/MobileOfficerSimulator.tsx'
];

const replacements = [
  { from: /bg-\[#0B1220\]/g, to: 'bg-white' },
  { from: /bg-\[#050B14\]/g, to: 'bg-gov-gray' },
  { from: /bg-\[#07111f\]/g, to: 'bg-white' },
  { from: /bg-slate-950/g, to: 'bg-white' },
  { from: /bg-slate-900/g, to: 'bg-gov-gray' },
  { from: /border-slate-800/g, to: 'border-gov-border' },
  { from: /border-slate-700/g, to: 'border-gov-border' },
  { from: /border-slate-600/g, to: 'border-gov-border' },
  { from: /text-slate-100/g, to: 'text-gov-charcoal' },
  { from: /text-slate-200/g, to: 'text-gov-charcoal' },
  { from: /text-slate-300/g, to: 'text-gov-charcoal/80' },
  { from: /text-slate-400/g, to: 'text-gov-charcoal/60' },
  { from: /text-slate-500/g, to: 'text-gov-charcoal/60' },
  { from: /text-white/g, to: 'text-gov-navy' },
  { from: /text-cyan-400/g, to: 'text-gov-navy' },
  { from: /text-cyan-300/g, to: 'text-gov-navy' },
  { from: /text-cyan-500/g, to: 'text-gov-navy' },
  { from: /bg-cyan-500\/15/g, to: 'bg-gov-gray' },
  { from: /bg-cyan-500\/10/g, to: 'bg-gov-gray' },
  { from: /border-cyan-500\/30/g, to: 'border-gov-border' },
  { from: /bg-\[#00E5FF\]/g, to: 'bg-gov-navy text-white' },
  { from: /bg-blue-500\/10/g, to: 'bg-white' },
  { from: /border-blue-400\/20/g, to: 'border-gov-border' },
  { from: /text-blue-300/g, to: 'text-gov-navy' },
  { from: /bg-blue-950\/40/g, to: 'bg-gov-gray' },
  { from: /bg-blue-900\/20/g, to: 'bg-gov-gray' },
  { from: /bg-blue-500\/20/g, to: 'bg-white' },
  { from: /text-blue-400/g, to: 'text-gov-navy' },
  { from: /text-blue-500/g, to: 'text-gov-navy' },
  { from: /bg-blue-600/g, to: 'bg-gov-navy text-white' },
  { from: /bg-blue-500/g, to: 'bg-gov-navy text-white' },
  { from: /text-amber-400/g, to: 'text-gov-charcoal font-bold' },
  { from: /text-amber-500/g, to: 'text-gov-charcoal font-bold' },
  { from: /text-green-400/g, to: 'text-green-600' },
  { from: /text-emerald-400/g, to: 'text-green-600' }
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    replacements.forEach(({from, to}) => {
      content = content.replace(from, to);
    });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
