import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from 'src/entities/user.entity';
import { UserProfileEntity } from 'src/entities/user-profile.entity';
import { UserSettingsEntity } from 'src/entities/user-setting.entity';
import { PortfolioTransactionEntity } from 'src/entities/portfolio-transaction.entity';
import { InvestmentPortfolioEntity } from 'src/entities/investment-portfolio.entity';
import { NewsEntity } from 'src/entities/news.entity';
import { TickersEntity } from 'src/entities/tickers.entity';
import { UserNewsEntity } from 'src/entities/user-news.entity';
import { UserTickersSubscribeEntity } from 'src/entities/user-tickers-subscribe.entity';
import { InvestorProfileEntity } from 'src/entities/investor-profile.entity';

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
        ],
    }) as TypeOrmModuleOptions;
