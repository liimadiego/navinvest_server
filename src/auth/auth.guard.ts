
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'decorators/public.decorator';
import { IS_STARTER_PLAN_KEY, IS_PRO_PLAN_KEY, IS_PREMIUM_PLAN_KEY } from 'decorators/plans.decorator';
import { UsersService } from 'users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private reflector: Reflector,
        private usersService: UsersService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        const isStarterPlan = this.reflector.getAllAndOverride<boolean>(IS_STARTER_PLAN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const isProPlan = this.reflector.getAllAndOverride<boolean>(IS_PRO_PLAN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const isPremiumPlan = this.reflector.getAllAndOverride<boolean>(IS_PREMIUM_PLAN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        let plansAllowed: string[] = [];

        if (isStarterPlan) {
            plansAllowed = ['starter', 'pro', 'premium'];
        } else if (isProPlan) {
            plansAllowed = ['pro', 'premium'];
        } else if (isPremiumPlan) {
            plansAllowed = ['premium'];
        }

        if (isStarterPlan || isProPlan || isPremiumPlan) {
            const userId = await this.getUserIdByHeaderRequest(request);
            const userHasAccess = await this.usersService.userHasAccess(userId, plansAllowed);

            if (!userHasAccess) {
                throw new UnauthorizedException();
            }
        }


        if (!token) {
            throw new UnauthorizedException();
        }
        try {
            const payload = await this.jwtService.verifyAsync(
                token,
                {
                    secret: jwtConstants.secret
                }
            );

            if (!payload) {
                throw new UnauthorizedException();
            }

            request['user'] = payload;
        } catch {
            throw new UnauthorizedException();
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }

    async getUserIdByHeaderRequest(request: any) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.substring(7);

        const decoded = this.jwtService.decode(token) as { sub: string, email: string };

        return decoded.sub || null;
    }
}
