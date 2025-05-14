import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { MongooseModuleOptions } from '@nestjs/mongoose';

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
        entities: [ __dirname + '/../entities/**/*.entity.{ts,js}' ],
    }) as TypeOrmModuleOptions;


export const MongoDBConfig = (): [string, MongooseModuleOptions] => ([
    `mongodb://${(process.env.ENVIROMENT !== 'development' ? `${process.env.MONGO_USER}:${process.env.MONGO_PASS}@` : ``)}${(process.env.MONGO_HOST || 'localhost')}:${(process.env.MONGO_PORT || '27017')}/${(process.env.MONGO_PATH || 'ai_invest')}`,
    {
        authSource: !(process.env.ENVIROMENT === 'development') ? 'admin' : undefined,
    }
]);