import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Data structures for rendimentos (dividends)
@Schema({ _id: false })
class Rendimento {
  @Prop()
  AtoSocietarioAprovacao: string;

  @Prop()
  DataBase: string;

  @Prop()
  ValorProvento: string;

  @Prop()
  DataPagamento: string;

  @Prop()
  PeriodoReferencia: string;

  @Prop()
  RendimentoIsentoIR: string;
}

// For Cotistas (shareholders) information
@Schema({ _id: false })
class Cotistas {
  @Prop()
  Total: number;

  @Prop()
  total: number;

  @Prop()
  PessoaFisica: number;

  @Prop()
  PJNaoFinanceira: number;

  @Prop()
  BancoComercial: number;

  @Prop()
  CorretoraDistribuidora: number;

  @Prop()
  OutrasPJFinanceiras: number;

  @Prop()
  InvestidoresNaoResidentes: number;

  @Prop()
  EntidadeAbertaPrevCompl: number;

  @Prop()
  EntidadeFechadaPrevCompl: number;

  @Prop()
  RegimeProprioPrev: number;

  @Prop()
  SociedadeSeguradora: number;

  @Prop()
  SociedadeCapArrendMercantil: number;

  @Prop()
  FundosInvImobiliario: number;

  @Prop()
  OutrosFundosInv: number;

  @Prop()
  CotistasDistFundo: number;

  @Prop()
  OutrosTiposCotistas: number;
}

// For Resumo (Summary) section
@Schema({ _id: false })
class DespesasSobrePatrimonio {
  @Prop()
  TxAdministracao: number;

  @Prop()
  Custodiante: number;
}

@Schema({ _id: false })
class RentabilidadePatrimonial {
  @Prop()
  Total: number;

  @Prop()
  Patrimonio: number;

  @Prop()
  Rendimentos: number;
}

@Schema({ _id: false })
class Resumo {
  @Prop()
  Ativo: number;

  @Prop()
  PatrimonioLiquido: number;

  @Prop()
  NumCotasEmitidas: number;

  @Prop()
  ValorPatrCotas: number;

  @Prop()
  DespesasSobrePatrimonioPctg: DespesasSobrePatrimonio;

  @Prop()
  RentabilidadePatrimonialPctg: RentabilidadePatrimonial;
}

// For Asset composition
@Schema({ _id: false })
class ComposicaoDireitosBens {
  @Prop()
  Terrenos: number;

  @Prop()
  ImoveisRendaAcabados: number;

  @Prop()
  ImoveisRendaConstrucao: number;

  @Prop()
  ImoveisVendaAcabados: number;

  @Prop()
  ImoveisVendaConstrucao: number;

  @Prop()
  OutrosDireitosReais: number;
}

@Schema({ _id: false })
class DireitosBensImoveis {
  @Prop()
  Total: number;

  @Prop()
  Composição: ComposicaoDireitosBens;
}

@Schema({ _id: false })
class ComposicaoInvestidos {
  @Prop()
  DireitosBensImoveis: DireitosBensImoveis;

  @Prop()
  Acoes: number;

  @Prop()
  Debentures: number;

  @Prop()
  BonusSubscricao: number;

  @Prop()
  CertificadosDepositoValMob: number;

  @Prop()
  CedulasDebentures: number;

  @Prop()
  FIA: number;

  @Prop()
  FIP: number;

  @Prop()
  FII: number;

  @Prop()
  FDIC: number;

  @Prop()
  OutrasCotasFI: number;

  @Prop()
  NotasPromissorias: number;

  @Prop()
  AcoesSociedadesAtivFII: number;

  @Prop()
  CotasSociedadesAtivFII: number;

  @Prop()
  CEPAC: number;

  @Prop()
  CriCra: number;

  @Prop()
  LetrasHipotecarias: number;

  @Prop()
  LciLca: number;

  @Prop()
  LIG: number;

  @Prop()
  OutrosValoresMobliarios: number;
}

@Schema({ _id: false })
class Investidos {
  @Prop()
  Total: number;

  @Prop()
  Composição: ComposicaoInvestidos;
}

@Schema({ _id: false })
class ComposicaoLiquidos {
  @Prop()
  Disponibilidades: number;

  @Prop()
  TitulosPublicos: number;

  @Prop()
  TitulosPrivados: number;

  @Prop()
  FundosRendaFixa: number;
}

@Schema({ _id: false })
class Liquidos {
  @Prop()
  Total: number;

  @Prop()
  Composição: ComposicaoLiquidos;
}

@Schema({ _id: false })
class ComposicaoValoresAReceber {
  @Prop()
  Alugueis: number;

  @Prop()
  VendaImoveis: number;

  @Prop()
  OutrosValores: number;
}

@Schema({ _id: false })
class ValoresAReceber {
  @Prop()
  Total: number;

  @Prop()
  Composição: ComposicaoValoresAReceber;
}

@Schema({ _id: false })
class InformacoesAtivos {
  @Prop()
  Liquidos: Liquidos;

  @Prop()
  Investidos: Investidos;

  @Prop()
  ValoresAReceber: ValoresAReceber;
}

@Schema({ _id: false })
class ComposicaoPassivos {
  @Prop()
  RendimentosDistribuir: number;

  @Prop()
  TxAdministracaoPagar: number;

  @Prop()
  TxPerformancePagar: number;

  @Prop()
  ObrigacoesAquisicaoImov: number;

  @Prop()
  AdiantamentoVendaImov: number;

  @Prop()
  AdiantamentoAlugueis: number;

  @Prop()
  ObrigacoesSecRecebiveis: number;

  @Prop()
  InstrumentosFinanceirosDeriv: number;

  @Prop()
  ProvisoesContigencias: number;

  @Prop()
  OutrosValoresPagar: number;
}

@Schema({ _id: false })
class InformacoesPassivos {
  @Prop()
  Total: number;

  @Prop()
  Composição: ComposicaoPassivos;
}

@Schema({ _id: false })
class InformacoesAdicionais {
  @Prop()
  TotalPassivo: string;

  @Prop()
  ProvisoesGarantias: string;

  @Prop()
  TotalImoveisOnus: string;

  @Prop()
  TotalGarantiasClasse: string;

  @Prop()
  TotalGarantiasCotistas: string;
}

@Schema({ _id: false })
class DadosMensais {
  @Prop()
  Competencia: string;

  @Prop()
  Cotistas: Cotistas;

  @Prop()
  Resumo: Resumo;

  @Prop()
  InformacoesAtivos: InformacoesAtivos;

  @Prop()
  InformacoesPassivos: InformacoesPassivos;

  @Prop()
  InformacoesAdicionais: InformacoesAdicionais;
}

// For Emissor in CriCra
@Schema({ _id: false })
class EmissorCriCra {
  @Prop()
  Companhia: string;

  @Prop()
  CNPJ: string;

  @Prop()
  Emissao: string;

  @Prop()
  Serie: string;

  @Prop()
  Quantidade: string;

  @Prop()
  Valor: string;
}

// For Emissor in FII and OutrasCotasFI
@Schema({ _id: false })
class EmissorFII {
  @Prop()
  Fundo: string;

  @Prop()
  CNPJ: string;

  @Prop()
  Quantidade: string;

  @Prop()
  Valor: string;
}

@Schema({ _id: false })
class FinanceirosFII {
  @Prop({ type: EmissorFII })
  Emissor: EmissorFII;
}

@Schema({ _id: false })
class FinanceirosCriCra {
  @Prop({ type: [EmissorCriCra] })
  Emissor: EmissorCriCra[];
}

@Schema({ _id: false })
class FinanceirosOutrasCotasFI {
  @Prop({ type: EmissorFII })
  Emissor: EmissorFII;
}

@Schema({ _id: false })
class Financeiros {
  @Prop()
  FII: FinanceirosFII;

  @Prop()
  CriCra: FinanceirosCriCra;

  @Prop()
  OutrasCotasFI: FinanceirosOutrasCotasFI;
}

@Schema({ _id: false })
class DadosTrimestral {
  @Prop()
  Competencia: string;

  @Prop()
  DataEncerTrimestre: string;

  @Prop()
  Financeiros: Financeiros;
}

@Schema({ _id: false })
class Ativo {
  @Prop()
  Nome: string;

  @Prop()
  ValorJusto: string;

  @Prop()
  Valor: string;

  @Prop()
  PercentValorizacaoDesvalorizacao: string;
}

@Schema({ _id: false })
class ValorContabil {
  @Prop({ type: [Ativo] })
  Ativo: Ativo[];
}

@Schema({ _id: false })
class Ativos {
  @Prop()
  ValorContabil: ValorContabil;

  @Prop()
  CriteriosAvaliacao: string;
}

@Schema({ _id: false })
class RemuneracaoAdministrador {
  @Prop()
  PoliticaRemuneracao: string;

  @Prop()
  ValorPagoAno: string;

  @Prop()
  PercentPatrimonioContabil: string;

  @Prop()
  PercentPatrimonioValorMercado: string;
}

@Schema({ _id: false })
class DadosAnual {
  @Prop()
  Competencia: string;

  @Prop()
  ProcessosJudiciais: string;

  @Prop()
  ProcessosJudiciaisSemelhantes: string;

  @Prop()
  Ativos: Ativos;

  @Prop()
  RemuneracaoAdministrador: RemuneracaoAdministrador;
}

@Schema({ _id: false })
class DadosAno {
  @Prop({ type: [Rendimento] })
  Rendimentos: Rendimento[];

  @Prop({ type: [DadosAnual] })
  Anual: DadosAnual[];

  @Prop({ type: [DadosTrimestral] })
  Trimestral: DadosTrimestral[];

  @Prop({ type: [DadosMensais] })
  Mensal: DadosMensais[];
}

@Schema({ _id: false })
class PoliticaDistribuicaoResultados {
  @Prop()
  Periodicidade: string;

  @Prop()
  DataBase: string;

  @Prop()
  DataPagamento: string;
}

@Schema({ _id: false })
class DadosComplementares {
  @Prop()
  TipoFundo: string;

  @Prop()
  ExercicioSocial: string;

  @Prop()
  DataConstituicao: string;

  @Prop()
  PublicoAlvo: string;

  @Prop()
  PrazoDuracao: string;

  @Prop()
  DataRegistroCVM: string;
}

@Schema({
    collection: 'fiisData',
})
export class FiisData extends Document {
  @Prop()
  CNPJ: string;

  @Prop({ type: Object })
  Administrador: {
    Nome: string;
    CNPJ: string;
  };

  @Prop({ type: Object })
  Autorregulacao: {
    Mandato: string;
    SegmentoAtuacao: string;
    TipoGestao: string;
  };

  @Prop()
  ClassificacaoANBIMA: string;

  @Prop()
  CodigoNegociacao: string;

  @Prop({ type: Object })
  DadosAnuais: {
    [year: string]: DadosAno;
  };

  @Prop()
  DadosComplementares: DadosComplementares;

  @Prop()
  Nome: string;

  @Prop()
  ObjetivoDoFundo: string;

  @Prop()
  PoliticaDeInvestimento: string;

  @Prop()
  PoliticaDistribuicaoResultados: PoliticaDistribuicaoResultados;

  @Prop()
  Tipo: string;
}

export const FiisDataSchema = SchemaFactory.createForClass(FiisData);