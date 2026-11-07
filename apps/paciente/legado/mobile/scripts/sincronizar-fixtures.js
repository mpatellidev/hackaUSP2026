// Copia as fixtures oficiais (docs/fixtures, dono #1) para o modo mock do app.
// O Metro só enxerga arquivos dentro de mobile/, por isso a cópia. Rode após mudar docs/fixtures:
//   npm run fixtures
const fs = require('fs');
const path = require('path');

const origem = path.resolve(__dirname, '../../docs/fixtures');
const destino = path.resolve(__dirname, '../src/api/mock/fixtures');
const arquivos = ['clinicas.json', 'contas-demo.json', 'usuarios.json', 'solicitacoes.json', 'eventos.json'];

fs.mkdirSync(destino, { recursive: true });
for (const nome of arquivos) {
  fs.copyFileSync(path.join(origem, nome), path.join(destino, nome));
  console.log(`copiado: ${nome}`);
}
