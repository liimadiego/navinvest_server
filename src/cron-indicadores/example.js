const fs = require('node:fs');
const { obtemIndicadoresAno } = require('./helper/obtemIndicadoresAno.js');

// Obtem dados fundamentalistas de todas as empresas listadas no ano de 2024 e salva em 'dados-2024.json'.
(async() => {
  const dados = await obtemIndicadoresAno(2024);
  fs.writeFileSync('./dados-2024.json', JSON.stringify(dados, undefined, '\t'));
  console.log('[!] Dados fundamentalistas salvos com sucesso em "dados-2024.json"\n ');
})();