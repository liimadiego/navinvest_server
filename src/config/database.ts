import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
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
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    }) as TypeOrmModuleOptions;
