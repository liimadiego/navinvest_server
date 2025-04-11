const util = require('node:util');
const stream = require('node:stream');
const unzipper = require('unzipper');

const { obtemEmpresasListadas } = require('./obtemEmpresasListadas')

const arquivosParaBaixar = {
  "ITR": new Set([ "BPA_con", "BPP_con", "DFC_MI_con", "DRE_con", "DVA_con" ]),
  "DFP": new Set([ "BPA_con", "BPP_con", "DFC_MI_con", "DRE_con", "DVA_con" ]),
  "FRE": new Set([ "distribuicao_capital", "posicao_acionaria", "remuneracao_total_orgao" ])
}
const objetoEscala = { "MIL": 1000, "UNIDADE": 1 }
let listedCompanies = undefined;
let dadosDasEmpresas = {}
let codToIdGeral = {};

const processaBalanco = (row) => {
  if (row['ORDEM_EXERC'] != "ÚLTIMO") return;
  
  if (!objetoEscala[row['ESCALA_MOEDA']])
    throw `Escala de moeda (${row['ESCALA_MOEDA']}) não incluso em 'objetoEscala'`;
  
  const cnpj = row['CNPJ_CIA'];

  if (!codToIdGeral[cnpj]) codToIdGeral[cnpj] = {};

  if (!dadosDasEmpresas[cnpj])
    dadosDasEmpresas[cnpj] = {
      'CNPJ': cnpj,
      'Nome': undefined,
      'CodCVM': undefined,
      'DistribuicaoCapital': {},
      'Acionistas': {},
      'Remuneracoes': {},
      'DadosTrimestrais': {}
    };
  dadosDasEmpresas[cnpj]['Nome'] = row['DENOM_CIA'];
  dadosDasEmpresas[cnpj]['CodCVM'] = (row['CD_CVM'] * 1) + '';

  dtRef = row['DT_REFER'];
  if (!codToIdGeral[cnpj][dtRef]) 
    codToIdGeral[cnpj][dtRef] = {};

  if (!codToIdGeral[cnpj][dtRef]['Balanco'])
    codToIdGeral[cnpj][dtRef]['Balanco'] = {};

  if (!dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef])
    dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef] = {
      'Data': dtRef,
      'DataInicial': undefined,
      'DataFinal': row['DT_FIM_EXERC'],
      'Balanco': {},
      'Demonstrativo': {}
    };
  else if (!dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef]['DataFinal'])
    dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef]['DataFinal'] = row['DT_FIM_EXERC'];

  const codToId = codToIdGeral[cnpj][dtRef]['Balanco'];

  const codigo = row['CD_CONTA'];
  const codigoSplit = codigo.split('.');

  let objAtual = dadosDasEmpresas[cnpj]["DadosTrimestrais"][dtRef]['Balanco'];
  let _cod = '';
  for (let i = 0; i < codigoSplit.length; i++) {
    const parte = codigoSplit[i];
    _cod += parte

    if (!codToId[_cod]) {
      codToId[_cod] = codigo;
      objAtual[codigo] = {
        'Codigo': codigo,
        'Nome': row['DS_CONTA'],
        'Valor': row['VL_CONTA'] * objetoEscala[row['ESCALA_MOEDA']],
        'Moeda': row['MOEDA'],
        'Fixo': (row['ST_CONTA_FIXA'] == 'S')
      }
    } else if (i < codigoSplit.length - 1) {
      const _id = codToId[_cod];
      if (!objAtual[_id]['subitens']) objAtual[_id]['subitens'] = {};
      objAtual = objAtual[_id]['subitens'];
    }
  }
};

const processaDemonstrativo = (row) => {
  if (row['ORDEM_EXERC'] != "ÚLTIMO") return;
  // console.log('row:', row, '\n ');
  
  if (!objetoEscala[row['ESCALA_MOEDA']])
    throw `Escala de moeda (${row['ESCALA_MOEDA']}) não incluso em 'objetoEscala'`;
  const cnpj = row['CNPJ_CIA'];

  if (!codToIdGeral[cnpj]) codToIdGeral[cnpj] = {};

  if (!dadosDasEmpresas[cnpj])
    dadosDasEmpresas[cnpj] = {
      'CNPJ': cnpj,
      'Nome': undefined,
      'CodCVM': undefined,
      'DistribuicaoCapital': {},
      'Acionistas': {},
      'Remuneracoes': {},
      'DadosTrimestrais': {}
    };
  dadosDasEmpresas[cnpj]['Nome'] = row['DENOM_CIA'];
  dadosDasEmpresas[cnpj]['CodCVM'] = (row['CD_CVM'] * 1) + '';

  dtRef = row['DT_REFER'];
  if (!codToIdGeral[cnpj][dtRef])
    codToIdGeral[cnpj][dtRef] = {};

  if (!codToIdGeral[cnpj][dtRef]['Demonstrativo'])
    codToIdGeral[cnpj][dtRef]['Demonstrativo'] = {};
  
  let codigo = row['CD_CONTA'].replace('.', '');
  const pts = codigo.split('.');
  const firstCodNum = pts[0];

  if (!codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum]) {
    const x = pts;
    codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum] = {
      'ToRemove': x.length - 1,
      'Cods': {}
    }
  }

  if (!dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef]) {
    dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef] = {
      'Data': dtRef,
      'DataInicial': row['DT_INI_EXERC'],
      'DataFinal': row['DT_FIM_EXERC'],
      'Balanco': {},
      'Demonstrativo': {}
    };
  } else {
    if (!dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef]['DataFinal'])
      dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef]['DataFinal'] = row['DT_FIM_EXERC'];

    if (!dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef]['DataInicial'])
      dadosDasEmpresas[cnpj]['DadosTrimestrais'][dtRef]['DataInicial'] = row['DT_INI_EXERC'];
  }

  const codToId = codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum]['Cods'];

  // const codigo = row['CD_CONTA'];
  const trl = codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum]['ToRemove'];
  if (trl)
    codigo = pts.slice(0, trl + 1).join('') + (pts.length > trl + 1 ? '.' + pts.slice(trl + 1).join('.') : '');

  // const codigoSplit = codigo.replace(codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum]['ToRemove'], codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum]['ReplaceWith']).split('.');
  const codigoSplit = codigo.split('.');
  
  // ++_p;
  // console.log('row:', row);
  // console.log(`codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum]:`, codToIdGeral[cnpj][dtRef]['Demonstrativo'][firstCodNum]);
  // console.log('trl:', trl);
  // console.log('codigo:', codigo);
  // console.log('codigoSplit:', codigoSplit);
  // console.log(' ');
  // if (_p >= 2) process.exit(1);

  let objAtual = dadosDasEmpresas[cnpj]["DadosTrimestrais"][dtRef]['Demonstrativo'];
  let _cod = '';
  for (let i = 0; i < codigoSplit.length; i++) {
    const parte = codigoSplit[i];
    _cod += parte

    if (!codToId[_cod]) {
      codToId[_cod] = codigo;
      objAtual[codigo] = {
        'Codigo': codigo,
        'Nome': row['DS_CONTA'],
        'Valor': row['VL_CONTA'] * objetoEscala[row['ESCALA_MOEDA']],
        'Moeda': row['MOEDA'],
        'Fixo': (row['ST_CONTA_FIXA'] == 'S')
      };
    } else if (i < codigoSplit.length - 1) {
      const _id = codToId[_cod];
      
      if (!objAtual[_id]) {
        console.log('objAtual:', objAtual);
        console.log('_id:', _id);
        console.log('_cod:', _cod);
        console.log('codToId:', codToId);
        console.log('codigoSplit:', codigoSplit);
        console.log('codigo:', codigo);
        console.log(' ');
        process.exit(1);
      }

      if (!objAtual[_id]['subitens']) objAtual[_id]['subitens'] = {};
      objAtual = objAtual[_id]['subitens'];
    }
  }
};

const processaRemuneracao = (row) => {
  const dtIni = row['Data_Inicio_Exercicio_Social'];
  const dtFim = row['Data_Fim_Exercicio_Social'];
  if (dtIni.slice(-6) != "-01-01" || dtFim.slice(-6) != "-12-31") return; // Ignora dados que não contemplem um ano inteiro

  const cnpj = row['CNPJ_Companhia'];
  if (!dadosDasEmpresas[cnpj])
    dadosDasEmpresas[cnpj] = {
      'CNPJ': cnpj,
      'Nome': undefined,
      'CodCVM': undefined,
      'DistribuicaoCapital': {},
      'Acionistas': {},
      'Remuneracoes': {},
      'DadosTrimestrais': {}
    };
  dadosDasEmpresas[cnpj]['Nome'] = row['Nome_Companhia'];

  const ano = dtIni.split('-')[0];
  if (!dadosDasEmpresas[cnpj]["Remuneracoes"][ano])
    dadosDasEmpresas[cnpj]["Remuneracoes"][ano] = { 
      "Ano": ano,
      "InicioExercicioSocial": dtIni,
      "FimExercicioSocial": dtFim,
      "RemuneracaoTotal": parseFloat(row['Total_Remuneracao']),
      "OrgaosAdministrativos": {}
    };
  
  const orgaoAdm = row['Orgao_Administracao'];
  if (!dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm])
    dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm] = {};
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["NumeroMembros"] = parseFloat(row['Numero_Membros']);
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["NumeroMembrosRemunerados"] = parseFloat(row['Numero_Membros_Remunerados']);

  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["RemuneracaoTotalOrgao"] = parseFloat(row['Total_Remuneracao_Orgao'])

  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["Salario"] = parseFloat(row['Salario'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["OutrosValoresFixos"] = parseFloat(row['Outros_Valores_Fixos'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["DescricaoOutrosRemuneracoesFixas"] = row['Descricao_Outros_Remuneracoes_Fixas']
  
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["Bonus"] = parseFloat(row['Bonus'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["Comissoes"] = parseFloat(row['Comissoes'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["BaseadoEmAcoes"] = parseFloat(row['Baseada_Acoes'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["BeneficiosDiretosIndiretos"] = parseFloat(row['Beneficios_Diretos_Indiretos'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["ParticipacaoResultados"] = parseFloat(row['Participacao_Resultados'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["OutrosValoresVariaveis"] = parseFloat(row['Outros_Valores_Variaveis'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["DescricaoOutrosRemuneracoesVariaveis"] = row['Descricao_Outros_Remuneracoes_Variaveis']

  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["PosEmprego"] = parseFloat(row['Pos_emprego'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["CessacaoCargo"] = parseFloat(row['Cessacao_Cargo'])

  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["ParticipacoesComites"] = parseFloat(row['Participacoes_Comites'])
  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["ParticipacaoReunioes"] = parseFloat(row['Participacao_Reunioes'])

  dadosDasEmpresas[cnpj]["Remuneracoes"][ano]["OrgaosAdministrativos"][orgaoAdm]["Observacao"] = row['Observacao']
};

const processaAcionistas = (row) => {
  if (row['CPF_CNPJ_Acionista_Relacionado']) return; // Ignora posição indireta
  
  const cnpj = row['CNPJ_Companhia'];
  if (!dadosDasEmpresas[cnpj])
    dadosDasEmpresas[cnpj] = {
      'CNPJ': cnpj,
      'Nome': undefined,
      'CodCVM': undefined,
      'DistribuicaoCapital': {},
      'Acionistas': {},
      'Remuneracoes': {},
      'DadosTrimestrais': {}
    };
  dadosDasEmpresas[cnpj]['Nome'] = row['Nome_Companhia'];
  
  dtRef = row['Data_Referencia']

  if (!dadosDasEmpresas[cnpj]['Acionistas'][dtRef]) {
    dadosDasEmpresas[cnpj]['Acionistas'][dtRef] = {
      'Referencia': dtRef,
      'UltimaAlteracao:': undefined,
      'UltimaAlteracaoTS:': undefined,
      'Lista': []
    }
  }

  if ((!(dadosDasEmpresas[cnpj]['Acionistas'][dtRef]['UltimaAlteracao'])) && row['Data_Ultima_Alteracao']) {
    const ultAlteracao = row['Data_Ultima_Alteracao'];
    dadosDasEmpresas[cnpj]['Acionistas'][dtRef]['UltimaAlteracao'] = ultAlteracao;
    dadosDasEmpresas[cnpj]['Acionistas'][dtRef]['UltimaAlteracaoTS'] = new Date(ultAlteracao + 'T00:00:00-0300').getTime();
  }
  
  dadosDasEmpresas[cnpj]['Acionistas'][dtRef]['Lista'].push({
    "Id": row['ID_Acionista'],
    "Nome": row['Acionista'],
    "Data": row['Data_Referencia'],
    "Tipo": row['Tipo_Pessoa_Acionista'],
    "CPF_CNPJ": row['CPF_CNPJ_Acionista'],
    "ResidenteExterior": (row['Residente_Exterior'] == 'S'),
    "AcionistaControlador": (row['Acionista_Controlador'] == 'S'),
    "ParticipanteAcordoAcionistas": (row['Participante_Acordo_Acionistas'] == 'S'),
    "UltimaAlteracao:": row['Data_Ultima_Alteracao'],
    "Posicao": {
      "Ordinarias": { "Quantidade": parseInt(row['Quantidade_Acao_Ordinaria_Circulacao']), "Percentual": parseFloat(row['Percentual_Acao_Ordinaria_Circulacao']) },
      "Preferenciais": { "Quantidade": parseInt(row['Quantidade_Acao_Preferencial_Circulacao']), "Percentual": parseFloat(row['Percentual_Acao_Preferencial_Circulacao']) },
      "Total": { "Quantidade": parseInt(row['Quantidade_Total_Acoes_Circulacao']), "Percentual": parseFloat(row['Percentual_Total_Acoes_Circulacao']) }
    }
  });

  // if (dadosDasEmpresas[cnpj]['Acionistas']['Referencia'] != dtRef) {
  //   dadosDasEmpresas[cnpj]['Acionistas']['Referencia'] = dtRef;
  //   dadosDasEmpresas[cnpj]['Acionistas']['Lista'] = [];
  // }
  
  // dadosDasEmpresas[cnpj]['Acionistas']['Lista'].push({
  //   "Id": row['ID_Acionista'],
  //   "Nome": row['Acionista'],
  //   "Data": row['Data_Referencia'],
  //   "Tipo": row['Tipo_Pessoa_Acionista'],
  //   "CPF_CNPJ": row['CPF_CNPJ_Acionista'],
  //   "ResidenteExterior": (row['Residente_Exterior'] == 'S'),
  //   "AcionistaControlador": (row['Acionista_Controlador'] == 'S'),
  //   "ParticipanteAcordoAcionistas": (row['Participante_Acordo_Acionistas'] == 'S'),
  //   "UltimaAlteracao:": row['Data_Ultima_Alteracao'],
  //   "Posicao": {
  //     "Ordinarias": { "Quantidade": parseInt(row['Quantidade_Acao_Ordinaria_Circulacao']), "Percentual": parseFloat(row['Percentual_Acao_Ordinaria_Circulacao']) },
  //     "Preferenciais": { "Quantidade": parseInt(row['Quantidade_Acao_Preferencial_Circulacao']), "Percentual": parseFloat(row['Percentual_Acao_Preferencial_Circulacao']) },
  //     "Total": { "Quantidade": parseInt(row['Quantidade_Total_Acoes_Circulacao']), "Percentual": parseFloat(row['Percentual_Total_Acoes_Circulacao']) }
  //   }
  // });
};

const processaDistrCapital = (row) => {
  const cnpj = row['CNPJ_Companhia'];
  if (!dadosDasEmpresas[cnpj])
    dadosDasEmpresas[cnpj] = {
      'CNPJ': cnpj,
      'Nome': undefined,
      'CodCVM': undefined,
      'DistribuicaoCapital': {},
      'Acionistas': {},
      'Remuneracoes': {},
      'DadosTrimestrais': {}
    };
  dadosDasEmpresas[cnpj]['Nome'] = row['Nome_Companhia'];

  dtRef = row['Data_Referencia']
  if (!dadosDasEmpresas[cnpj]['DistribuicaoCapital'][dtRef])
    dadosDasEmpresas[cnpj]['DistribuicaoCapital'][dtRef] = {
      'Data': dtRef,
      'UltimaAssembleia': undefined
    };
  
  if ((!(dadosDasEmpresas[cnpj]['DistribuicaoCapital'][dtRef]['UltimaAssembleia'])) && row['Data_Ultima_Assembleia']) {
    const ultAssembleia = row['Data_Ultima_Assembleia'];
    dadosDasEmpresas[cnpj]['DistribuicaoCapital'][dtRef]['UltimaAssembleia'] = ultAssembleia;
    dadosDasEmpresas[cnpj]['DistribuicaoCapital'][dtRef]['UltimaAssembleiaTS'] = new Date(ultAssembleia + 'T00:00:00-0300').getTime();
  }
  
  dadosDasEmpresas[cnpj]['DistribuicaoCapital'][dtRef]['Acionistas'] = {
    'PF': parseInt(row['Quantidade_Acionistas_PF']),
    'PJ': parseInt(row['Quantidade_Acionistas_PJ']),
    'InvestidoresInstitucionais': parseInt(row['Quantidade_Acionistas_Investidores_Institucionais'])
  };
  dadosDasEmpresas[cnpj]['DistribuicaoCapital'][dtRef]['AcoesEmCirculacao'] = {
    'Ordinarias': { 
      "Quantidade": parseInt(row['Quantidade_Acoes_Ordinarias_Circulacao']),
      "Percentual": parseFloat(row['Percentual_Acoes_Ordinarias_Circulacao'])
    },
    'Preferenciais': {
      "Quantidade": parseInt(row['Quantidade_Acoes_Preferenciais_Circulacao']),
      "Percentual": parseFloat(row['Percentual_Acoes_Preferenciais_Circulacao'])
    },
    'Total': {
      'Quantidade': parseInt(row['Quantidade_Total_Acoes_Circulacao']),
      'Percentual': parseFloat(row['Percentual_Total_Acoes_Circulacao'])
    }
  };
}

const funcoesDeProcessamento = {
  'FRE': {
    'distribuicao_capital': processaDistrCapital,
    'posicao_acionaria': processaAcionistas,
    'remuneracao_total_orgao': processaRemuneracao
  },
  'ITR': {
    'BPA_con': processaBalanco,
    'BPP_con': processaBalanco,
    'DFC_MI_con': processaDemonstrativo,
    'DRE_con': processaDemonstrativo,
    'DVA_con': processaDemonstrativo,
  },
  'DFP': {
    'BPA_con': processaBalanco,
    'BPP_con': processaBalanco,
    'DFC_MI_con': processaDemonstrativo,
    'DRE_con': processaDemonstrativo,
    'DVA_con': processaDemonstrativo,
  }
}

async function processaCSV (stream, tipo, arquivo) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let headers = null;
    stream.on('data', (chunk) => {
      buffer += chunk.toString('latin1'); // Append the chunk to our buffer
      const lines = buffer.split('\r\n');
      buffer = lines.pop(); // Keep the last potentially incomplete line in the buffer
      for (const line of lines) {
        if (line.trim() === '') continue;
        const values = line.split(';');
        if (!headers) {
          headers = values;
        } else {
          const row = {};
          for (let i = 0; i < headers.length; i++)
            row[headers[i]] = values?.[i];
          funcoesDeProcessamento[tipo][arquivo](row);
        }
      }
    });
    
    stream.on('end', () => {
      if (buffer.trim() !== '') { 
        const values = buffer.split(';');
        if (headers) {
          const row = {};
          for (let i = 0; i < headers.length; i++)
            row[headers[i]] = values?.[i];
          funcoesDeProcessamento[tipo][arquivo](row);
        }
      }
      resolve();
    });
    
    stream.on('error', (err) => {
      console.error(`[E] processaCSV > ${tipo} ${arquivo}:`, err);
      reject(err);
    });
  });
}

async function obtemDados (ano, tipo) {
  try {
    console.log(`Baixando ${tipo} ${ano}...`);
    const r = await fetch(`https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/${tipo.toUpperCase()}/DADOS/${tipo.toLowerCase()}_cia_aberta_${ano}.zip`);
    if (!r.ok) throw `[E] Baixando arquivo ${tipo.toUpperCase()} ${ano}: (${r.status}, ${r.statusText}) ${(await r.text())}`;
    
    // Cria uma 'bodyStream' apartir do 'r.body'
    const bodyStream = stream.Readable.fromWeb(r.body);
    
    // Create a promise that resolves when unzipping is complete
    const extractionPromise = new Promise((resolve, reject) => {
      const extractPromises = [];
      
      // Use the unzipper to process the zip file
      const directory = unzipper.Parse();
      
      directory.on('entry', (entry) => {
        const fileName = entry.path;
        const fileType = fileName.split('_').slice(3, -1).join('_');

        if (!arquivosParaBaixar[tipo].has(fileType)) {
          entry.autodrain();
        } else {
          // Create a promise that resolves when this entry is done processing
          const extractPromise = processaCSV(entry, tipo, fileType)
            .catch(err => {
              console.error(`Error extracting ${fileName}:`, err);
              return null;
            });
          extractPromises.push(extractPromise);
          console.log(`Processando ${tipo} ${ano} '${fileType}'...`);
        }
      });
      
      directory.on('error', reject);
      
      directory.on('close', async () => {
        try {
          await Promise.all(extractPromises);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      
      // Pipe the download stream to the unzipping stream
      bodyStream.pipe(directory);
    });
    
    // Wait for the extraction to complete
    await extractionPromise;
    console.log(`[!] Dados ${tipo} ${ano} processados com sucesso.\n `);

  } catch (error) {
    console.error(`[E] Obtendo dados ${tipo} ${ano}:`, error, '\n ');
  }
}

async function obtemArquivosCVM (tipo) {
  const r = await fetch(`https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/${tipo.toUpperCase()}/DADOS/`);
  const body = await r.text();
  if (!r.ok) throw `[E] obtemArquivosCVM > Obtendo arquivos ${tipo.toUpperCase()}: (${r.status}, ${r.statusText}) ${(body)}\n `;

  const fileData = [];
  const filePattern = /<a href="([^"]+)">([^<]+)<\/a>\s+(\d{2}-[A-Za-z]+-\d{4} \d{2}:\d{2})\s+(\d+[A-Z])/g;
  
  let match;
  while ((match = filePattern.exec(body)) !== null) {
    const [ _, href, fileName, fileLastUpdate, fileSize ] = match;
    if (href === '../' || fileName === '../') continue;

    const _DtSplit = fileLastUpdate.split(' ');
    const fileLastUpdateTS = new Date(_DtSplit[0].split('-').reverse() + ' ' + _DtSplit[1] + '-03').getTime();

    fileData.push({ fileName, fileLastUpdate, fileLastUpdateTS, fileSize });
  }

  return fileData;
}

function extrairSubitens (obj, resultado = {}, prefixo = "") {
  for (const key in obj) {
    const item = obj[key];

    if (item.subitens) {
      extrairSubitens(item.subitens, resultado, (prefixo ? prefixo + " > " + item.Nome : item.Nome));
    } else if (item && typeof item === 'object' && item.Nome && item.Valor !== undefined) {
      resultado[key] = { nome: prefixo + " > " + item.Nome, valor: item.Valor };
    }
  }
  return resultado;
}
          
function decontaVal (item, itemAnt) {
  // console.log('Descontando:', item.Nome);
  item.ValorOriginal = item.Valor;
  item.ValorDescontado = (itemAnt?.ValorOriginal || 0);
  item.Valor -= (itemAnt?.ValorOriginal || 0);
  if (item.subitens) {
    for (const subKey in item.subitens) {
      const subItem = item.subitens[subKey];
      const subItemAnt = itemAnt?.subitens?.[subKey];
      decontaVal(subItem, subItemAnt);
    }
  }
}

const naoCirculanteKeywords = [ 
  "imobilizado", 
  "intangível", 
  "investimentos", 
  "longo prazo", 
  "diferido", 
  "goodwill", 
  "coligadas", 
  "operações de crédito",
  "associadas ao risco de crédito",
  "operações de arrendamento",
  "passivos financeiros ao custo amortizado > ",
  "não circulante",
  "nao circulante",
  "avaliados a valor justo através de outros resultados abrangentes > participações societárias",
  "ao valor justo através do resultado > empréstimos e financiamentos",
  "ativos financeiros > ativos financeiros avaliados a valor justo através do resultado > créditos com partes relacionadas",
  "passivos financeiros ao valor justo através do resultado > outras obrigações",
  "outros passivos financeiros designados ao valor justo através do resultado > outras obrigações",
  "ativos financeiros > ativos financeiros avaliados a valor justo através de outros resultados abrangentes",
  "outros passivos > provisão para passivos contingentes",
  "outros passivos > provisão de perda esperada decorrente de risco de crédito para avais e fianças",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > empréstimos e adiantamentos a clientes",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > outros ativos",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > (-) provisão para perda esperada",
  "ativos financeiros > ativos financeiros avaliados a valor justo através do resultado > empréstimos e adiantamentos a clientes",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > benefício residual em operações securitizadas",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > recebíveis imobiliários",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > valores a receber por cessão de créditos",
  "ao valor justo através do resultado > notas estruturadas",
  "passivos fiscais > imposto de renda e contribuição social - diferidas",
  "outros passivos > provisão para perda esperada",
  "outros passivos > contratos de seguro e previdência privada",
  "ativos financeiros > ativos financeiros avaliados a valor justo através do resultado > títulos designados a valor justo",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > provisão para perdas por não recuperação (impairment)",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > devedores diversos",
  "outros ativos > depósitos judiciais",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado",
  "passivos financeiros ao custo amortizado",
  "obrigações de arrendamento",
  "derivativos utilizados como hedge",
  "obrigações por convênios oficiais",
  "obrigações por aquisição de bens e direitos",
  "relações interdependências",
  "outros passivos > tributários",
  "outros passivos financeiros designados ao valor justo através do resultado > derivativos",
  "ativos financeiros > ativos financeiros avaliados a valor justo através do resultado > ativos financeiros mensurados ao valor justo no resultado",
  "ativos financeiros > ativos financeiros avaliados a valor justo através do resultado > ativos financeiros não destinados a negociação mensurados obrigatoriamente a valor justo no resultad",
  "passivos financeiros ao valor justo através do resultado > passivos financeiros mensurados ao valor justo no resultado",
  "participação de não controladores",
  "provisão de seguros e previdência privada",
  "a valor justo através do resultado > empréstimos  e adiantamentos a clientes",
  "ativos financeiros ao valor justo no resultado",
  "ativos financeiros avaliados a valor justo através do resultado",
  "compromissos de empréstimos",
  "ao valor justo através do resultado > dívida subordinada",
  "designados ao valor justo através do resultado > captações - repasses no exterior",
  "passivos > tributário",
  "passivos financeiros ao valor justo através do resultado > passivos financeiros ao valor justo por meio do resultado",
  "passivos financeiros ao valor justo através do resultado",
  "passivos financeiros ao valor justo por meio do resultado",
  "financeiros ao valor justo no resultado > notas estruturadas",
  "ativos financeiros mensurados ao custo amortizado",
  "ao valor justo através do resultado > dividas subordinadas",
];

const circulanteKeywords = [ 
  "caixa", 
  "disponível", 
  "aplicações de liquidez", 
  "curto prazo", 
  "tributos correntes", 
  "estoque", 
  "contas a receber", 
  "depósito compulsório",
  "ativos financeiros avaliados ao valor justo",
  "depósitos interfinanceiros",
  "aplicações no mercado aberto",
  "títulos e valores mobiliários",
  "outros ativos financeiros",
  "tributos > imposto de renda e contribuição social - correntes",
  "não correntes a venda",
  "outros ativos > outros",
  "avaliados ao valor justo através do resultado",
  "provisões trabalhistas, fiscais e cíveis",
  "provisões para perdas esperadas com garantias prestadas e compromissos de empréstimos",
  " > passivos fiscais",
  " > outros passivos",
  "provisões",
  "circulante",
  "obrigações sociais",
  "fornecedores",
  "obrigações fiscais",
  "correntes",
  "outros passivos > negociação e intermediação de valores",
  "tributos > outros",
  "depósitos no banco central",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > outros créditos",
  " > passivos financeiros ao valor justo através do resultado",
  "outros passivos > obrigações diversas",
  "títulos para negociação",
  "instrumentos financeiros derivativos",
  "empréstimos e adiantamentos em instituições financeiras",
  "depósitos compulsórios banco central do brasil",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > empréstimos e adiantamentos a instituições financeiras",
  "ativos financeiros > ativos financeiros avaliados a valor justo através do resultado > derivativos",
  "depósitos compulsórios no banco central",
  "passivos financeiros ao valor justo através do resultado > derivativos",
  "depositos no banco central do brasil",
  "outros ativos > contratos de seguro",
  "passivos fiscais > outras",
  "ativos financeiros > ativos financeiros avaliados ao custo amortizado > empréstimos e outros valores com instituições financeiras",
  "passivos fiscais > imposto de renda e contribuição social a r ecolher",
  "passivos fiscais > outros impostos e contribuições a recolher",
  "passivos financeiros ao valor justo através do resultado > posições vendidas",
  "outros passivos > outros",
  " > ativos de operações descontinuadas",
  " > outras obrigações",
  "cobrança e arrecadação de tributos e assemelhados",
  "obrigações por compra de câmbio",
  "outros passivos > sociais e estatutárias",
  "outros passivos > provisão para pagamentos a efetuar",
  "outros passivos > credores diversos - país",
  "outros passivos > operações de câmbio",
  "ativos financeiros avaliados a valor justo através do resultado > instrumentos fianceiros derivativos",
  "credores diversos",
  "financeiros mensurados ao valor justo no resultado mantidos para negociação",
  "corrente",
  "fiscais > outros",
  "financeiros ao valor justo através do resultado > operações compromissadas",
  "imposto de renda e contribuição social a recolher",
  "reservas no banco central",
  "operações de seguros",
  "impostos a compensar",
  "financeiros ao valor justo no resultado > derivativos",
];

async function obtemIndicadoresAno (ano) {
  codToIdGeral = {};
  dadosDasEmpresas = {}

  if (isNaN(ano * 1) || (!Number.isInteger(ano * 1)) || (ano * 1) <= 0) 
    throw `Prametro 'ano' (${ano}) é invalido, o mesmo deve ser um valor inteiro e numérico maior que 0.`;
  
  // Sempre pega dados do ano solicitado e do anterior.
  ano *= 1; // Convert to number
  
  // Obtem arquivos da CVM
  const arquivosCVM = {
    'FRE': await obtemArquivosCVM('FRE'),
    'ITR': await obtemArquivosCVM('ITR'),
    'DFP': await obtemArquivosCVM('DFP')
  };

  // Limita o ano selecionado com base nos arquivos da CVM
  const infAnosCVM = {
    'FRE': { all: arquivosCVM['FRE'].map(x => x.fileName.slice(0, -4).split('_').at(-1) * 1) },
    'ITR': { all: arquivosCVM['ITR'].map(x => x.fileName.slice(0, -4).split('_').at(-1) * 1) },
    'DFP': { all: arquivosCVM['DFP'].map(x => x.fileName.slice(0, -4).split('_').at(-1) * 1) }
  }
  infAnosCVM['FRE'].min = Math.min(...infAnosCVM['FRE'].all);
  infAnosCVM['FRE'].max = Math.max(...infAnosCVM['FRE'].all);
  infAnosCVM['FRE'].anoSel = Math.max(infAnosCVM['FRE'].min, Math.min(infAnosCVM['FRE'].max, ano));

  infAnosCVM['ITR'].min = Math.min(...infAnosCVM['ITR'].all);
  infAnosCVM['ITR'].max = Math.max(...infAnosCVM['ITR'].all);
  infAnosCVM['ITR'].anoSel = Math.max(infAnosCVM['ITR'].min, Math.min(infAnosCVM['ITR'].max, ano));

  infAnosCVM['DFP'].min = Math.min(...infAnosCVM['DFP'].all);
  infAnosCVM['DFP'].max = Math.max(...infAnosCVM['DFP'].all);
  infAnosCVM['DFP'].anoSel = Math.max(infAnosCVM['DFP'].min, Math.min(infAnosCVM['DFP'].max, ano));

  if (
    infAnosCVM['FRE'].anoSel != ano && 
    infAnosCVM['ITR'].anoSel != ano && 
    infAnosCVM['DFP'].anoSel != ano
  )
    throw `Não existem dados refentes ao ano de ${ano} no site da CVM.`;
    
  // Obtem informações da B3 sobre as companhias listadas
  try {
    throw 'NOT DEBUG'; // USADO APENAS PARA DEBUG
    // listedCompanies = JSON.parse(fs.readFileSync('./listedCompanies.json')); // USADO APENAS PARA DEBUG
  } catch (error) {
    listedCompanies = await obtemEmpresasListadas();
    // fs.writeFileSync('./listedCompanies.json', JSON.stringify(listedCompanies, undefined, '\t')); // USADO APENAS PARA DEBUG
  }

  // Obtem arquivos da CVM
  try {
    throw 'NOT DEBUG'; // USADO APENAS PARA DEBUG
    // dadosDasEmpresas = JSON.parse(fs.readFileSync('./FRE_example_' + ano + '.json')); // USADO APENAS PARA DEBUG
  } catch (error) {
    // Tenta sempre obter dados do ano selecionado e um ano anteior ao mesmo.
    let proms = [];
    for (const offset of [ -1, 0 ]) {
      for (const tipo of [ 'FRE', 'ITR', 'DFP' ]) {
        const anoDaVez = infAnosCVM[tipo].anoSel + offset;
        if (anoDaVez >= infAnosCVM[tipo].min && anoDaVez <= infAnosCVM[tipo].max)
          proms.push(obtemDados(anoDaVez + '', tipo));
      }
    }
    await Promise.all(proms);
    // fs.writeFileSync('./FRE_example_' + ano + '.json', JSON.stringify(dadosDasEmpresas, undefined, '\t')); // USADO APENAS PARA DEBUG
    // fs.writeFileSync('./FRE_simple_example_' + ano + '.json', JSON.stringify(Object.fromEntries([ Object.entries(dadosDasEmpresas)[0] ]), undefined, '\t')); // USADO APENAS PARA DEBUG
  }
  
  console.log(`[!] Todos os dados 'ITR ${infAnosCVM['ITR'].anoSel}', 'DFP ${infAnosCVM['DFP'].anoSel}' e 'FRE ${infAnosCVM['FRE'].anoSel}' foram obtidos.`);

  const anoTS = new Date(ano + '-12-31T00:00:00-0300').getTime();

  let _c = 0;
  const dadosSimplificados = {};
  const dadosDasEmpresasValues = Object.values(dadosDasEmpresas);
  for (const dados of dadosDasEmpresasValues) {
    const cnpjDigits = dados.CNPJ.replace(/\D/g, '');
    const numCNPJ = (cnpjDigits ? parseInt(cnpjDigits, 10) : 0) + '';
    const b3Infos = listedCompanies[numCNPJ];
    if (!b3Infos) continue; // Não é uma empresa listada na B3.

    let obj = {
      CNPJ: dados.CNPJ,
      Ticker: b3Infos.issuingCompany,
      DataListagem: b3Infos.dateListing,
      Segmento: b3Infos.segment,
      B3: {
        Tipo: b3Infos.type,
        Status: b3Infos.status,
        Mercado: b3Infos.market,
        IndicadorMercado: b3Infos.marketIndicator
      },
      Nome: dados.Nome,
      NomeNegociação: b3Infos.tradingName,
      CodCVM: dados.CodCVM
    };
    
    // Processa informações sobre ações:
    const acionistasList = Object.values(dados.Acionistas).sort((a, b) => (b.UltimaAlteracaoTS || new Date(b.Data).getTime()) - (a.UltimaAlteracaoTS || new Date(a.Data).getTime()));
    const acionistas = acionistasList.find(a => (a.UltimaAlteracaoTS) < anoTS || ((!a.UltimaAlteracaoTS) && new Date(a.Referencia).getUTCFullYear() <= new Date(anoTS).getUTCFullYear()));

    let numeroTotalAcoes = { Ordinarias: 0, Preferenciais: 0, Totais: 0 };
    let acoesEmTesouraria = {
      Ordinarias: { Quantidade: 0, Percentual: 0 },
      Preferenciais: { Quantidade: 0, Percentual: 0 },
      Totais: { Quantidade: 0, Percentual: 0 },
      Atualizado: undefined
    };
    let acoesFreeFloat = { 
      Ordinarias: { Quantidade: 0, Percentual: 0 },
      Preferenciais: { Quantidade: 0, Percentual: 0 },
      Totais: { Quantidade: 0, Percentual: 0 },
      Atualizado: undefined
    };
    if (!acionistas) {
      const dadosTrimestraisValues = Object.values(dados['DadosTrimestrais']);
      if ((!Object.keys(dados['Acionistas']).length) && (!Object.keys(dados['Remuneracoes']).length) && (!(dadosTrimestraisValues.filter(t => t.Data.split('-')[0] == ano).length))) continue;
      // console.log('(!dadosTrimestraisValues.length):', (!dadosTrimestraisValues.length));
      // console.log(`dadosTrimestraisValues.filter(t => t.Data.split('-')[0] == ano):`, dadosTrimestraisValues.filter(t => t.Data.split('-')[0] == ano));
      // console.log(`(dadosTrimestraisValues.filter(t => t.Data.split('-')[0] == ano).length):`, (!(dadosTrimestraisValues.filter(t => t.Data.split('-')[0] == ano).length)), '\n ');
      

      // console.log('dados:', dados, '\n ');
      // console.log('Empresa sem lista de "dados.Acionistas":', util.inspect(dados.Acionistas, { colors: true, depth: Infinity }), '\n ');
      // console.log('acionistasList:', acionistasList, '\n ');
      // console.log('_c:', _c + ' / ' + dadosDasEmpresasValues.length);
      // process.exit(1);
      continue;
    }
    for (const acionista of acionistas.Lista) {
      numeroTotalAcoes.Ordinarias += acionista.Posicao.Ordinarias.Quantidade;
      numeroTotalAcoes.Preferenciais += acionista.Posicao.Preferenciais.Quantidade;
      numeroTotalAcoes.Totais += acionista.Posicao.Total.Quantidade;

      if (acionista.Nome === 'Ações Tesouraria' && acionista.UltimaAlteracao === '' && acionista.CPF_CNPJ === '') {
        acoesEmTesouraria = acionista.Posicao;
        acoesEmTesouraria.Atualizado = acionistas.UltimaAlteracaoTS;
      } else if (acionista.Nome === 'Outros' && acionista.UltimaAlteracao === '' && acionista.CPF_CNPJ === '') {
        acoesFreeFloat = acionista.Posicao;
        acoesFreeFloat.Atualizado = acionistas.UltimaAlteracaoTS;
      }
    }

    const distrCapitalList = Object.values(dados.DistribuicaoCapital).sort((a, b) => b.UltimaAssembleiaTS - a.UltimaAssembleiaTS);
    const distrCapital = distrCapitalList.find(a => a.UltimaAssembleiaTS < anoTS) || distrCapitalList.find(a => new Date(a.Data).getUTCFullYear() <= new Date(anoTS).getUTCFullYear());

    const tiposDeAcionistas = distrCapital.Acionistas;
    tiposDeAcionistas.Atualizado = distrCapital.UltimaAssembleiaTS;

    if (acoesFreeFloat.Atualizado == null || distrCapital.UltimaAssembleiaTS > acoesFreeFloat.Atualizado) {
      acoesFreeFloat = distrCapital.AcoesEmCirculacao;
      acoesFreeFloat.Atualizado = distrCapital.UltimaAssembleiaTS;
    }

    obj.Acoes = {
      Acionistas: {
        Lista: acionistas.Lista,
        Atualizado: acionistas.UltimaAlteracaoTS
      },
      TiposDeAcionistas: tiposDeAcionistas,
      NumeroTotal: numeroTotalAcoes,
      Tesouraria: acoesEmTesouraria,
      FreeFloat: acoesFreeFloat
    };

    // Inclui as remunerações:
    obj.Remuneracoes = dados.Remuneracoes;

    // Processa dados trimestrais.
    let dadosTrimestrais = [];
    let dadosTrimestraisSimplificados = [];
    for (const dadoTrimestral of Object.values(dados.DadosTrimestrais)) {
      const dataSplit = dadoTrimestral.Data.split('-');
      if (dataSplit[0] != ano) continue;
      dadoTrimestral.Mes = dataSplit[1] * 1;

      const ativos = {
        'Total': dadoTrimestral['Balanco']['1']['Valor'],
        'Circulante': {
          Valor: 0,
          Composicao: []
        },
        'NaoCirculante': {
          Valor: 0,
          Composicao: []
        }
      };
      for (const [ codigo, item ] of Object.entries(extrairSubitens(dadoTrimestral['Balanco']['1']['subitens']))) {
        if (!item.valor) continue;

        if (naoCirculanteKeywords.some(kw => item.nome.toLowerCase().includes(kw))) {
          ativos['NaoCirculante'].Composicao.push(item);
          ativos['NaoCirculante'].Valor += item.valor;
          
        } else if (circulanteKeywords.some(kw => item.nome.toLowerCase().includes(kw))) {
          ativos['Circulante'].Composicao.push(item);
          ativos['Circulante'].Valor += item.valor;

        } else {
          console.log(`Balanço (${dados.Nome} CNPJ= ${dados.CNPJ} CVM= ${dados.CodCVM}):`, util.inspect(dadoTrimestral['Balanco']['1'], { colors: true, depth: Infinity }), '\n ');
          console.log('Could not define "ativo" as "Circulante" or "NaoCirculante": (' + codigo + ') "' + item.nome + '" \n ');
          console.log('_c:', _c + ' / ' + dadosDasEmpresasValues.length);
          process.exit(1);
        }
      }

      const passivos = {
        'Total': dadoTrimestral['Balanco']['2']['Valor'],
        'Circulante': {
          Valor: 0,
          Composicao: []
        },
        'NaoCirculante': {
          Valor: 0,
          Composicao: []
        },
        'PatrimonioLiquido': {
          Valor: 0,
          Composicao: []
        }
      };
      for (const [ codigo, item ] of Object.entries(extrairSubitens(dadoTrimestral['Balanco']['2']['subitens']))) {
        if (!item.valor) continue;

        if (item.nome.toLowerCase().includes('patrimônio líquido') || item.nome.toLowerCase().includes('patrimonio liquido')) {
          passivos['PatrimonioLiquido'].Composicao.push(item);
          passivos['PatrimonioLiquido'].Valor += item.valor;

        } else if (naoCirculanteKeywords.some(kw => item.nome.toLowerCase().includes(kw))) {
          passivos['NaoCirculante'].Composicao.push(item);
          passivos['NaoCirculante'].Valor += item.valor;
          
        } else if (circulanteKeywords.some(kw => item.nome.toLowerCase().includes(kw))) {
          passivos['Circulante'].Composicao.push(item);
          passivos['Circulante'].Valor += item.valor;

        } else {
          console.log(`Balanço (${dados.Nome} CNPJ= ${dados.CNPJ} CVM= ${dados.CodCVM}):`, util.inspect(dadoTrimestral['Balanco']['2'], { colors: true, depth: Infinity }), '\n ');
          console.log('Could not define "passivo" as "Circulante" or "NaoCirculante": (' + codigo + ') "' + item.nome + '" \n ');
          console.log('_c:', _c + ' / ' + dadosDasEmpresasValues.length);
          process.exit(1);
        }
      }

      const simplificado = { Data: dadoTrimestral.Data, DataInicial: dadoTrimestral.DataInicial, DataFinal: dadoTrimestral.DataFinal, 'Balanco Simplificado': { Ativos: ativos, Passivos: passivos } };

      if (dadosTrimestrais.length === 0) {
        dadosTrimestrais.push(dadoTrimestral);
        dadosTrimestraisSimplificados.push(simplificado);
      } else {
        let idx = dadosTrimestrais.findIndex(dt => dt.Mes > dadoTrimestral.Mes);
        if (idx === -1) {
          dadosTrimestrais.push(dadoTrimestral)
          dadosTrimestraisSimplificados.push(simplificado);
        } else {
          dadosTrimestrais.splice(idx, 0, dadoTrimestral);
          dadosTrimestraisSimplificados.splice(idx, 0, simplificado);
        }
      }
    }

    for (let i = 0; i < dadosTrimestrais.length; i++) {
      const dreTri = dadosTrimestrais[i].Demonstrativo;
      const dreTriAnt = dadosTrimestrais[i - 1]?.Demonstrativo;

      let dreSimplificado = {
        'Receitas': undefined, // 3.01
        'Despesas': undefined, // 3.02
        'Lucro Bruto': undefined, // 3.03
        'Outras Receitas/Despesas Operacionais': undefined, // 3.04
        'EBITDA': undefined, // Calc - "Earnings Before Interest, Taxes, Depreciation and Amortization"
        'Amortização/Depreciação': undefined, // Find(Sub)
        'EBIT': undefined, // Calc/Find - "Earnings Before Interest and Taxes" (3.05 - Resultado Antes do Resultado Financeiro e dos Tributos)
        'Resultado Financeiro': undefined, // Calc/Find - (3.06 - Resultado Financeiro )
        'EBT': undefined, // Calc/Find - "Earnings Before Taxes" (3.07 - Resultado Antes dos Tributos sobre o Lucro )
        'Impostos': undefined, // Find
        'Lucro Líquido': undefined,
      };
      
      const dreCodExpectations = {
        '3.01': { ns: 'Receitas', ne: [ 'receita' ] },
        '3.02': { ns: 'Despesas', ne: [ 'despesa', 'custo', 'sinistros e despesas' ] },
        '3.03': { ns: 'Lucro Bruto', ne: [ 'resultado bruto', 'lucro bruto' ] },
        // '3.04': { ns: 'Outras Receitas/Despesas Operacionais', ne: [ 'despesas/receitas operacionais', 'outras despesas e receitas operacionais', 'outras despesas/receitas operacionais', 'outras receitas e despesas operacionais' ] },
        // '3.11': { ns: 'Lucro Líquido', ne: [ 'lucro ou prejuízo líquido', 'lucro/prejuízo líquido', 'lucro ou prejuízo', 'lucro/prejuízo' ] }
      };

      // Search on items
      const dreToFind = {
        'EBIT': [ ' antes do resultado financeiro e dos tributos' ],
        'Resultado Financeiro': [ 'resultado financeiro' ],
        'EBT': [ 'resultado antes dos tributos sobre o lucro' ],
        'Impostos': [ 'imposto de renda' ],
        'Lucro Líquido': [ 'lucro ou prejuízo líquido', 'lucro/prejuízo líquido', 'lucro ou prejuízo', 'lucro/prejuízo' ],
        'Outras Receitas/Despesas Operacionais': [ 'despesas/receitas operacionais', 'outras despesas e receitas operacionais', 'outras despesas/receitas operacionais', 'outras receitas e despesas operacionais' ]
      };

      // Search on items and bubitens
      const dreToFindSub = {
        'Amortização/Depreciação': [ 'amortização', 'depreciação' ],
      };

      for (const dreCod of Object.keys(dreTri).filter(cod => cod.startsWith('3'))) {
        const item = dreTri[dreCod];
        const itemAnt = dreTriAnt?.[dreCod];

        // Desconta os valores do trimestre anterior do 'item' e de seus 'subitens'.
        decontaVal(item, itemAnt);

        const nome = item.Nome;
        const nomeLower = nome.toLowerCase();
        let nomeSimples = undefined;

        if (dreCodExpectations[item.Codigo]) {
          // Item padronizado.
          if (!dreCodExpectations[item.Codigo].ne.some(xpc => nomeLower.startsWith(xpc))) {
            console.log(`DRE "completo": ${util.inspect(Object.fromEntries(Object.entries(dadosTrimestrais.at(0).Demonstrativo).filter(([k, v]) => k.startsWith('3'))), { colors: true, depth: Infinity })}\n `);
            console.log(`Algo de errado com item código ${item.Codigo} é esperado que seu nome comece com "${dreCodExpectations[item.Codigo].ne.join(' | ')}": ${util.inspect(item, { colors: true, depth: Infinity })}\n `);
            console.log('_c:', _c + ' / ' + dadosDasEmpresasValues.length);
            process.exit(1);
          }

          nomeSimples = dreCodExpectations[item.Codigo].ns;
          dreSimplificado[nomeSimples] = item;
        
        } else {
          // Item não padronizado.
          let itemFound = false;

          for (const toFindSimpleName in dreToFind) {
            const keywords = dreToFind[toFindSimpleName];
            if (keywords.some(kw => nomeLower.includes(kw))) {
              dreSimplificado[toFindSimpleName] = item;
              itemFound = true;
              break;
            }
          }
        }

        if (item.subitens) {
          const listaSubItens = extrairSubitens(item.subitens, {}, item.Nome);
          for (const cod in listaSubItens) {
            const obj = listaSubItens[cod];
            for (const toFindSimpleName in dreToFindSub) {
              const keywords = dreToFindSub[toFindSimpleName];
              if (keywords.some(kw => obj.nome.toLowerCase().includes(kw))) {
                if (!dreSimplificado[toFindSimpleName])
                  dreSimplificado[toFindSimpleName] = { 'Valor': 0, 'Composição': [] };
                dreSimplificado[toFindSimpleName]['Valor'] += obj.valor;
                dreSimplificado[toFindSimpleName]['Composição'].push(obj);
              }
            }
          }
        }
        
        // else if (!item.subitens) {
        //   for (const toFindSimpleName in dreToFind) {
        //     const keywords = dreToFind[toFindSimpleName];
        //     if (keywords.some(kw => nomeLower.includes(kw))) {
        //       if (!dreSimplificado[toFindSimpleName])
        //         dreSimplificado[toFindSimpleName] = { 'Valor': 0, 'Composição': [] };
        //       dreSimplificado[toFindSimpleName]['Valor'] += item.Valor;
        //       dreSimplificado[toFindSimpleName]['Composição'].push(item);
        //     }
        //   }
        // }

        // // Try to find each one of 'dreToFind' in 'item.subitens'.
        // if (item.subitens) {
        //   const listaSubItens = extrairSubitens(item.subitens, {}, item.Nome);
        //   for (const cod in listaSubItens) {
        //     const obj = listaSubItens[cod];
        //     // console.log('obj:', obj);
        //     // process.exit(1);
        //     // obj.nome = `${item.Nome}${obj.nome}`;
      
        //     for (const toFindSimpleName in dreToFind) {
        //       const keywords = dreToFind[toFindSimpleName];
        //       if (keywords.some(kw => obj.nome.toLowerCase().includes(kw))) {
        //         if (!dreSimplificado[toFindSimpleName])
        //           dreSimplificado[toFindSimpleName] = { 'Valor': 0, 'Composição': [] };
        //         dreSimplificado[toFindSimpleName]['Valor'] += obj.valor;
        //         dreSimplificado[toFindSimpleName]['Composição'].push(obj);
        //       }
        //     }
        //   }
        // }
      }

      if (dreSimplificado['Lucro Líquido'] === undefined) {
        console.log(`Algo errado não foi possível encontrar 'Lucro Líquido' no DRE "${dreTri.Mes}" (${obj.Nome}, CNPJ= ${obj.CNPJ}, CodCVM= ${obj.CodCVM}): ${util.inspect(dreTri, { colors: true, depth: 3 })}\n `);
        console.log('dreSimplificado:', util.inspect(dreSimplificado, { colors: true, depth: Infinity }), '\n ');
        console.log('_c:', _c + ' / ' + dadosDasEmpresasValues.length);
        process.exit(1);
      }

      if (dreSimplificado['Impostos'] === undefined) {
        console.log(`Algo errado não foi possível encontrar 'Impostos' no DRE "${dreTri.Mes}" (${obj.Nome}, CNPJ= ${obj.CNPJ}, CodCVM= ${obj.CodCVM}): ${util.inspect(dreTri, { colors: true, depth: 3 })}\n `);
        console.log('dreSimplificado:', util.inspect(dreSimplificado, { colors: true, depth: Infinity }), '\n ');
        console.log('_c:', _c + ' / ' + dadosDasEmpresasValues.length);
        process.exit(1);
      }
      
      // Calcula 'EBT', 'EBIT' e 'EBITDA'.
      dreSimplificado['EBT'] = { Valor: dreSimplificado['Lucro Líquido'].Valor - dreSimplificado['Impostos'].Valor };
      
      if (!dreSimplificado['EBIT'])
        dreSimplificado['EBIT'] = { Valor: dreSimplificado['EBT'].Valor - (dreSimplificado['Resultado Financeiro']?.Valor || 0) };
      
      dreSimplificado['EBITDA'] = { Valor: dreSimplificado['EBIT'].Valor - (dreSimplificado['Amortização/Depreciação']?.Valor || 0) };

      dadosTrimestraisSimplificados[i]['DRE Simplificado'] = dreSimplificado;

      // console.log('dreSimplificado:', util.inspect(dreSimplificado, { colors: true, depth: Infinity }), '\n ');
      // process.exit(1);
      
    }

    obj.Trimestrais = dadosTrimestraisSimplificados;

    ++_c;

    // // DEBUG - Verification
    // if (_c > 10e3 && (
    //   obj.Trimestrais.at(-1) == undefined ||
    //   obj.Trimestrais.at(-1)['DataFinal'] !== '2024-12-31' || 
    //   obj.Trimestrais.at(0)['DRE Simplificado']['Resultado Financeiro'] == undefined || 
    //   obj.Trimestrais.at(0)['DRE Simplificado']['EBIT'] == undefined
    // )) {
    //   if (dadosTrimestrais.at(0))
    //     console.log('Demonstrativo bruto:', util.inspect(Object.fromEntries(Object.entries(dadosTrimestrais.at(0).Demonstrativo).filter(([k, v]) => k.startsWith('3'))), { colors: true, depth: Infinity }), '\n ');

    //   if (obj.Trimestrais.at(0)) {
    //     console.log(`${obj.Nome} (CNPJ= ${obj.CNPJ}, cvm= ${obj.CodCVM}): `, util.inspect(obj.Trimestrais.at(0), { colors: true, depth: 2 }), '\n ');
        
    //     // if (obj.Trimestrais.at(0)['DRE Simplificado']['Resultado Financeiro'])
    //     //   console.log('Resultado Financeiro:', obj.Trimestrais.at(0)['DRE Simplificado']['Resultado Financeiro']['Composição'].reduce((s, item) => s + '\n\t\x1b[33m' + item.valor + '\x1b[0m - ' + item.nome, ''), '\n ');
        
    //     if (obj.Trimestrais.at(0)['DRE Simplificado']['Amortização/Depreciação'])
    //       console.log('Amortização/Depreciação:', obj.Trimestrais.at(0)['DRE Simplificado']['Amortização/Depreciação']['Composição'].reduce((s, item) => s + '\n\t\x1b[33m' + item.valor + '\x1b[0m - ' + item.nome, ''), '\n ');
        
    //     // if (obj.Trimestrais.at(0)['DRE Simplificado']['Impostos'])
    //     //   console.log('Impostos:', obj.Trimestrais.at(0)['DRE Simplificado']['Impostos']['Composição'].reduce((s, item) => s + '\n\t\x1b[33m' + item.valor + '\x1b[0m - ' + item.nome, ''), '\n ');
        
    //     console.log('Ultimo trimestre:', obj.Trimestrais.at(-1)['DataFinal']);
  
    //     console.log(`obj.Trimestrais.at(-1) !== '2024-12-31':`, (obj.Trimestrais.at(-1) !== '2024-12-31'));
    //     console.log(`obj.Trimestrais.at(0)['DRE Simplificado']['Resultado Financeiro'] == undefined:`, (obj.Trimestrais.at(0)['DRE Simplificado']['Resultado Financeiro'] == undefined));
    //     console.log(`obj.Trimestrais.at(0)['DRE Simplificado']['EBIT'] == undefined:`, (obj.Trimestrais.at(0)['DRE Simplificado']['EBIT'] == undefined), '\n ');
    //   } else {
    //     const ultTri = Object.keys(dados.DadosTrimestrais).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).at(-1);
    //     if (ultTri) {
    //       console.log('Ultimo trimestre:', ultTri, '\n ');
    //     } else {
    //       console.log('dados:', dados, '\n ');
    //     }
    //   }
      
    //   console.log(`${obj.Nome} (CNPJ= ${obj.CNPJ}, cvm= ${obj.CodCVM})\n `);
    //   console.log('_c:', _c + ' / ' + dadosDasEmpresasValues.length);
      
    //   process.exit(1);
    // }

    dadosSimplificados[obj.Ticker] = obj;
  }

  // USADO APENAS PARA DEBUG
  // const _fileName = './simplificado' + ano + '.json';
  // fs.writeFileSync(_fileName, JSON.stringify(dadosSimplificados, undefined, '\t'));
  // console.log('[!] Dados simplificados salvos em "' + _fileName + '".\n ');
  // return;

  return dadosSimplificados;
}

module.exports = { obtemIndicadoresAno };