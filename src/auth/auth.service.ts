import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async signIn(email: string, pass: string): Promise<{ accessToken: string }> {
        const user = await this.usersService.findOne(email);
        if (user?.password_hash !== pass) {
            throw new UnauthorizedException();
        }

        const payload = { sub: user.id, username: user.full_name, email: user.email };

        return {
            accessToken: await this.jwtService.signAsync(payload),
        };
    }

    async getUserFromToken(token: string): Promise<any> {
        const decoded = this.jwtService.decode(token) as { sub: string, email: string };
        const user = await this.usersService.findById(decoded.sub);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (user.email !== decoded.email) {
            throw new UnauthorizedException('Invalid token');
        }

        const userData = {
            id: user.id,
            email: user.email,
            displayName: user.full_name,
            role: user.role,
            created_at: user.created_at
        }

        return { user: userData };
    }

    async getTokenFromRequest(request: any): Promise<string | null> {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}
