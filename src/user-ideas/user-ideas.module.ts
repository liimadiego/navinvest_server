import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserIdeasService } from './user-ideas.service';
import { UserIdeasController } from './user-ideas.controller';
import { UserIdeaEntity } from 'entities/user-idea.entity';
import { JwtHelper } from 'utils/jwt.service';

@Module({
    imports: [TypeOrmModule.forFeature([UserIdeaEntity])],
    providers: [UserIdeasService, JwtHelper],
    controllers: [UserIdeasController],
})
export class UserIdeasModule {}
