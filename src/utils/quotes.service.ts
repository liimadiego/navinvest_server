import { Injectable } from '@nestjs/common';

@Injectable()
export class QuotesService {
    GetQuoteLastDayEachMonth(
        quotes: { date: string; close: number }[],
        startDate: string,
        endDate: string
    ): { date: string; close: number }[] {
        const result: { date: string; close: number }[] = [];
        const monthMap = new Map<string, { date: string; close: number }>();

        for (const quote of quotes) {
            const quoteDate = new Date(quote.date);
            if (quoteDate >= new Date(startDate) && quoteDate <= new Date(endDate)) {
                const monthKey = `${quoteDate.getFullYear()}-${quoteDate.getMonth() + 1}`;
                monthMap.set(monthKey, quote);
            }
        }

        for (const [, value] of monthMap) {
            result.push(value);
        }

        return result;
    }

}