import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from '../entities/user.entity';
import { UserProfileEntity } from '../entities/user-profile.entity';
import { UserSettingsEntity } from '../entities/user-setting.entity';
import { PortfolioTransactionEntity } from '../entities/portfolio-transaction.entity';
import { InvestmentPortfolioEntity } from '../entities/investment-portfolio.entity';
import { NewsEntity } from '../entities/news.entity';
import { TickersEntity } from '../entities/tickers.entity';
import { UserNewsEntity } from '../entities/user-news.entity';
import { UserTickersSubscribeEntity } from '../entities/user-tickers-subscribe.entity';
import { InvestorProfileEntity } from '../entities/investor-profile.entity';
import { TagEntity } from '../entities/tag.entity';

dotenv.config();

export const TypeOrmConfig = () =>
    ({
        type: 'postgres',
        database: process.env.DATABASE_DB,
        host: process.env.HOST_DB,
        password: process.env.PASS_DB,
        username: process.env.USER_DB,
        port: Number(process.env.PORT_DB),
        synchronize: false,
        extra: {
            connectionLimit: 10,
        },
        ssl: !(process.env.ENVIROMENT === 'development') ? { rejectUnauthorized: false } : false,
        entities: [
            UserEntity,
            UserProfileEntity,
            UserSettingsEntity,
            PortfolioTransactionEntity,
            InvestmentPortfolioEntity,
            NewsEntity,
            TickersEntity,
            UserNewsEntity,
            UserTickersSubscribeEntity,
            InvestorProfileEntity,
            TagEntity,
        ],
    }) as TypeOrmModuleOptions;
