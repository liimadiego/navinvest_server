import * as cron from 'node-cron';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { NewsService } from '../news/news.service';
import { TickerService } from '../ticker/ticker.service';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { MailService } from 'utils/mail.service';

@Injectable()
export class CronNewsService implements OnModuleInit {
    constructor(
        private readonly tickerService: TickerService,
        private readonly newsService: NewsService,
        private readonly usersService: UsersService,
        private readonly mailService: MailService
    ) { }

    onModuleInit() {
        this.startCronJob();
    }

    private async startCronJob() {
        // cron.schedule('* * * * *', async () => {
        // await this.functionGetFinancialContextWithAI(); //rodar todos os dias
        // await this.getFinancialNewsWithAI(); //rodar todos os dias
        // await this.sendDailyNewsToSubscribers(true); //rodar todos os dias
        // await this.saveNewsInDatabase();
        //      await this.sendNewsToSubscribers();
        // });
        // console.log('Cron job agendada.');
    }

    private async fetchAndSaveNews(searchTerm: string, ticker: any) {
        let urlToSearch = `https://gnews.io/api/v4/search?country=br&q=${searchTerm}&expand=content&apikey=${process.env.GNEWS_API_KEY}`;
        let response = await fetch(urlToSearch);
        let data = await response.json();

        if (data.articles && data.articles.length > 0) {
            console.log(`Encontradas ${data.articles.length} notícias para "${searchTerm}"`);
            for (const article of data.articles) {
                let newsWithThisUrl = await this.newsService.getNewsByUrl(article.url);
                if (!newsWithThisUrl) {
                    await this.newsService.saveNews({
                        id: null,
                        uuid: uuidv4(),
                        title: article.title,
                        description: article.description,
                        content: article.content,
                        source: article.source.name,
                        url: article.url,
                        image_url: article.image || null,
                        published_at: new Date(article.publishedAt),
                        created_at: new Date(),
                        ticker: ticker
                    });
                }
            }
            console.log(`Notícias salvas para "${searchTerm}"`);
        }

        //força aguardar 1s para não estourar o limite de requisições da API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    private async saveNewsInDatabase() {
        const searchedCompanyNames = new Set<string>();
        const tickers = await this.tickerService.getTickersToSearchNews(10, true);

        for (const ticker of tickers) {
            console.log(`Buscando notícias para o ticker ${ticker.ticker}`);
            // const tickerEntity = await this.tickerService.getTickerById(ticker.id);
            // const companyName = tickerEntity.asset_name;

            await this.fetchAndSaveNews(ticker.ticker, ticker);

            // if (!searchedCompanyNames.has(companyName)) {
            //     console.log(`Buscando notícias para a empresa ${companyName}`);

            //     await this.fetchAndSaveNews(companyName, tickerEntity);

            //     searchedCompanyNames.add(companyName);
            // }

            await this.tickerService.updateLatestSearchNews(ticker);
        }
    }

    private async sendNewsToSubscribers() {
        const news: any = await this.newsService.getNewsToSendToSubscribers(50);

        for (const newsItem of news) {
            console.log(`Enviando notícia para o usuário ${newsItem.u_email} (${newsItem.t_ticker})`);
        }
    }

    private async functionGetFinancialContextWithAI() {

        const todayFormatted = new Date().toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '/');

        console.log(`Iniciando a coleta de contexto financeiro com AI para a data: ${todayFormatted}`);

        const prompt = `Utilizando como base esse modelo, me de um contexto geral do mundo dos investimentos e o que o ronda. A pesquisa deve ser feita na data de hoje (${todayFormatted}) com dados atualizados e fontes confiáveis.

        Modelo: {
        "cenário_global": "xxx", 
        "cenário_brasil": "xxx", 
        "notícias_relevantes": [
            "xxx", 
            "xxx" 
        ],
            "indicadores": {
                "selic": "x.x%", 
                "ipca_anual": "x.x%", 
                "ibov_variacao_7d": "-x.x%", 
                "sp500_variacao_7d": "+x.x%" 
            }
        }

        Não se prenda ao modelo, ele não é completo, o que você puder trazer de contexto traga, será a base para uma ferramenta muito importante.

        IMPORTANTE MEU AMIGO GPT, A SESSÃO indicadores É PARA CONTER OS VALORES ATUAIS, NÃO PROJEÇÕES OU VALORES PASSADOS. USE FONTES CONFIÁVEIS E ATUALIZADAS, COMO BANCO CENTRAL, IBGE, B3, ETC.

        Retorne JSON.
        
        CARA, POR FAVOR, RETORNE APENAS O JSON, SEM TEXTO EXPLICATIVO, APENAS O JSON LIMPO, SEM NADA ALÉM DO JSON. EU SALVO SEU RETORNO DIRETO EM UM ARQUIVO JSON, ENTÃO SEU RETORNO TEM QUE SER APENAS O JSON LIMPO, SEM TEXTO EXPLICATIVO, SEM NADA ALÉM DO JSON. NÃO ME FAÇA DESATIVAR ESSA FEATURE POR VOCÊ MANDAR ERRADO.`;

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'tools=v1'
            },
            body: JSON.stringify({
                model: process.env.OPEN_AI_MODEL,
                input: prompt,
                instructions: 'Use a ferramenta web search para buscar informações atualizadas.',
                tools: [{ type: 'web_search' }],
                tool_choice: 'auto',
                temperature: 0.7,
                top_p: 1.0,
                store: true,
            }),
        });

        console.log('Resposta inicial recebida da OpenAI');

        const initialData = await response.json();
        const id = initialData.id;

        for (let i = 0; i < 20; i++) {
            console.log(`Tentativa ${i + 1} de obter o contexto financeiro...`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const final = await fetch(`https://api.openai.com/v1/responses/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'tools=v1'
                }
            });

            const finalData = await final.json();

            const hasMessageType = finalData.output.some((item: any) => item.type === 'message');
            if (hasMessageType) {
                const messageItem = finalData.output.find((item: any) => item.type === 'message');
                if (messageItem && messageItem.content && messageItem.content.length > 0) {
                    try {
                        const parsedJson = JSON.parse(messageItem.content[0].text.replace('```json', '').replace('```', ''));
                        fs.writeFileSync('financial_context.json', JSON.stringify(parsedJson, null, 2).replace('```json', '').replace('```', ''));
                    } catch (error) {
                        fs.writeFileSync('financial_context.json', messageItem.content[0].text.replace('```json', '').replace('```', ''));
                        console.error('Erro ao fazer o parse do JSON:', error);
                    }
                }
                return;
            }

            console.log(`⏳ Aguardando... tentativa ${i + 1}`);
        }
    }

    private async getFinancialNewsWithAI() {
        const todayFormatted = new Date().toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '/');

        console.log(`Buscando notícias financeiras para o dia ${todayFormatted}`);

        const prompt = `
        **REGRA, PARA TITULOS, APENAS A PARTIR DE H2, POIS EU JA UTILIZO UMA TAG H1 PARA TITULO DO EMAIL.**

        Você é o responsável por um jornal digital que atende milhares de usuários, trazendo as principais notícias do mundo financeiro e afins. Você é quem pesquisa, filtra e organiza as notícias. Seu padrão é trazer notícias de fontes confiáveis, você traz notícias sobre o contexto macro econômico, notícias sobre ações, commodities, criptomoedas e tudo que envolve o mundo dos investimentos. Você traz do contexto Brasil e do Mundo. Pesquise as principais notícias de hoje (${todayFormatted}) que forem importantes para o investidor experiênte e traga no formato JSON.

        Não de pequenos tópicos, senão parece ter sido feito as pressas ou por uma máquina. Desenvolva os assuntos e traga um jornal rápido, porém completo para o investidor.

        NÃO SE ESQUEÇA DE UTILIZAR TAGS HTML o front irá utilizar. EU PRECISO QUE SIGA ESSA REGRA, POIS É O QUE O FRONT ESPERA. NÃO ME FAÇA DESATIVAR ESSA FEATURE POR VOCÊ MANDAR ERRADO. UTILIZE HTML POIS SERA ENVIADO POR EMAIL.

        **REGRA, PARA TITULOS, APENAS A PARTIR DE H2, POIS EU JA UTILIZO UMA TAG H1 PARA TITULO DO EMAIL.**
        
        Modelo: {
            "answer": RESPOSTA AQUI EM HTML,
            "links": [
                {
                    "fromWhere": "NOMEAQUI"
                    "url": "https://link-da-noticia.com"
                },
                {
                    "fromWhere": "NOMEAQUI"
                    "url": "https://link-da-noticia.com"
                }
            ]
        }
            
        é importante seguir o modelo (JSON) pois ele será utilizado e espera esse padrão
        
        Entregue o JSON como se fosse a versão final para o usuario ler dentro do answer. Use <QUEBRA_LINHA> para quebra de linha, pois usarei um replace no front para trocar por <br>.
        `;

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'tools=v1'
            },
            body: JSON.stringify({
                model: process.env.OPEN_AI_MODEL,
                input: prompt,
                instructions: 'Use a ferramenta web search para buscar informações atualizadas.',
                tools: [{ type: 'web_search' }],
                tool_choice: 'auto',
                temperature: 0.7,
                top_p: 1.0,
                store: true,
            }),
        });

        console.log('Resposta inicial recebida da OpenAI');
        const initialData = await response.json();
        const id = initialData.id;


        for (let i = 0; i < 20; i++) {
            console.log(`Tentativa ${i + 1} de obter a resposta final da OpenAI`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const final = await fetch(`https://api.openai.com/v1/responses/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'tools=v1'
                }
            });

            const finalData = await final.json();

            const output = finalData.output;
            if (output && output.length > 0) {
                const hasMessageType = finalData.output.some((item: any) => item.type === 'message');
                if (hasMessageType) {
                    const messageItem = finalData.output.find((item: any) => item.type === 'message');
                    if (messageItem && messageItem.content && messageItem.content.length > 0) {
                        try {
                            // Sanitize JSON string by removing control characters
                            const sanitizedText = messageItem.content[0].text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                            const parsedJson = JSON.parse(sanitizedText);
                            fs.writeFileSync('financial_news.json', JSON.stringify(parsedJson, null, 2));
                        } catch (error) {
                            fs.writeFileSync('financial_news.json', messageItem.content[0].text);
                            console.error('Erro ao fazer o parse do JSON:', error);
                        }
                    }
                    return;
                }
                console.log(`⏳ Aguardando... tentativa ${i + 1}`);
            } else {
                console.log(finalData)
            }
        }
    }

    private async sendDailyNewsToSubscribers(testMode = false) {
        try {
            const news: string = fs.readFileSync('financial_news.json', 'utf-8');

            if (!news) {
                console.error('Nenhuma notícia encontrada.');
                return;
            }

            const newsData = JSON.parse(news);
            const newsLinks = newsData.links.map((link: any) => {
                return `<a href="${link.url}">${link.fromWhere}</a><br>`;
            }).join('');
            const newsAnswer = newsData.answer.replace(/\(\[[^\]]+\]\(https?:\/\/[^\)]+\)\)/g, '');

            const allUsers = await this.usersService.getAllUsers();

            for (const user of allUsers) {
                const userMail = user.email;
                if (userMail.endsWith('@navinvest.ai') || (testMode && userMail != 'diegolima.sao@gmail.com')) {
                    continue;
                }

                this.mailService.sendDailyNewsMail(userMail, user.full_name, newsAnswer, newsLinks);
            }

        } catch (error) {
            console.error('Erro ao ler o arquivo financial_news.json:', error);
        }
    }
}