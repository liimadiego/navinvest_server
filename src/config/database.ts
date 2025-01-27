import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { NotificationEntity } from 'src/entities/notification.entity';
import { UserEntity } from 'src/entities/user.entity';
import { UserProfileEntity } from 'src/entities/user-profile.entity';
import { UserSettingsEntity } from 'src/entities/user-setting.entity';
import { PortfolioTransactionEntity } from 'src/entities/portfolio-transaction.entity';
import { InvestmentPortfolioEntity } from 'src/entities/investment-portfolio.entity';
import { MonitoredAssetEntity } from 'src/entities/monitored-asset.entity';

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
        //logging: true,
        extra: {
            connectionLimit: 10,
        },
        entities: [
            NotificationEntity,
            UserEntity,
            UserProfileEntity,
            UserSettingsEntity,
            PortfolioTransactionEntity,
            InvestmentPortfolioEntity,
            MonitoredAssetEntity
        ],
    }) as TypeOrmModuleOptions;
