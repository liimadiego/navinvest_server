async function fetch2 (url, options = { timeout: 5e3 }) {
  const { timeout, ...opt } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  opt.signal = controller.signal;
  const r = await fetch(url, opt).finally(() => clearTimeout(timeoutId));
  if (r.status !== 200) throw `Request error > HTTP (${r.status}) ${await r.text()}`;
  return await r.json();
}

async function obtemEmpresasListadas () {
  const companies = {};

  let totalPages = undefined;
  const options = {
    "language": "pt-br",
    "pageNumber": 1,
    "pageSize": 100
  };

  while (!(options.pageNumber > totalPages)) {
    const r = await fetch2(`https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetInitialCompanies/${btoa(JSON.stringify(options))}`);
  
    if (totalPages === undefined) totalPages = r.page.totalPages;
  
    options.pageNumber = r.page.pageNumber + 1;
    
    for (const comp of r.results)
      companies[comp.cnpj] = comp;
  }

  return companies;
}

module.exports = { obtemEmpresasListadas };