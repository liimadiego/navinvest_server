import { CustomFunction } from "./custom_functions.dto";

export const tools: CustomFunction[] = [
    {
        type: 'function',
        function: {
            name: 'companiesService_getCompanyByTicker',
            description: 'Get information about a company.',
            parameters: {
                type: 'object',
                properties: {
                    company_ticker: {
                        type: 'string',
                        description: 'The ticker of the company you want to get information about.',
                    },
                },
                required: ['company_ticker'],
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'tickerService_validateTicker',
            description: 'Check if a ticker exists: true or false.',
            parameters: {
                type: 'object',
                properties: {
                    ticker: {
                        type: 'string',
                        description: 'The ticker of the company you want to validate.',
                    },
                },
                required: ['ticker'],
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'backtestService_getQuotationsByTicker',
            description: 'Get the last quotations of a company with the time period being specified by the user.',
            parameters: {
                type: 'object',
                properties: {
                    ticker: {
                        type: 'string',
                        description: 'The ticker symbol of the company you want to get quotations for.',
                    },
                    period: {
                        type: 'number',
                        description: 'The number of months to look back for historical stock quotations (e.g., 1 for one month, 3 for a quarter, 12 for a year).',
                    }
                },
                required: ['ticker', 'period'],
            }
        }
    }
];