import { UsersService } from 'users/users.service';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from 'entities/user.entity';
import { ResetPasswordCodeEntity } from 'entities/reset-password-codes.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { jwtConstants } from './constants';
import { AuthGuard } from './auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { MailService } from 'utils/mail.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([UserEntity, ResetPasswordCodeEntity]),
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    MailService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule { }
