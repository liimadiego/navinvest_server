import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TagEntity } from '../entities/tag.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TagService {

    constructor(
        @InjectRepository(TagEntity)
        private readonly tagRepository: Repository<TagEntity>,
        @InjectRepository(TickersEntity)
        private readonly tickersRepository: Repository<TickersEntity>,
    ) { }

    async addTagsToTickers(tickerNames: string[], tagNames: string[]): Promise<void> {
        const tags = await this.tagRepository.find({
            where: tagNames.map((name) => ({ name })),
        });

        if (!tags.length) {
            throw new NotFoundException(`Nenhuma das tags fornecidas foi encontrada`);
        }

        const tickers = await this.tickersRepository.find({
            where: tickerNames.map((ticker) => ({ ticker })),
            relations: ['tags'],
        });

        if (!tickers.length) {
            throw new NotFoundException(`Nenhum ticker encontrado com os nomes fornecidos`);
        }

        tickers.forEach((ticker) => {
            tags.forEach((tag) => {
                if (!ticker.tags.some((t) => t.id === tag.id)) {
                    ticker.tags.push(tag);
                }
            });
        });

        await this.tickersRepository.save(tickers);
    }

    async getTagsByTickerName(tickerName: string): Promise<TagEntity[]> {
        return this.tagRepository.createQueryBuilder('tag')
            .leftJoin('tag.tickers', 'tickers')
            .where('tickers.ticker = :tickerName', { tickerName })
            .getMany();
    }
}
