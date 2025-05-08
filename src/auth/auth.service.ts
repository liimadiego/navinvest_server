import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async signIn(email: string, pass: string): Promise<{ accessToken: string }> {
        const user = await this.usersService.findOne(email);

        const passwordMatch = await bcrypt.compare(pass, user.password_hash);
        if (!passwordMatch) {
            throw new UnauthorizedException();
        }

        const payload = { sub: user.id, username: user.full_name, email: user.email };

        return {
            accessToken: await this.jwtService.signAsync(payload),
        };
    }

    async signUp(email: string, pass: string, full_name: string, phone_number: string): Promise<{ accessToken: string }> {
        try {
            const existingMail = await this.usersService.findOne(email);
            const existingPhone = await this.usersService.findByPhoneNumber(phone_number);

            if (existingMail) {
                throw new UnauthorizedException('O e-mail digitado já está cadastrado');
            }

            if (existingPhone) {
                throw new UnauthorizedException('O celular digitado já está cadastrado');
            }

            const salt = await bcrypt.genSalt(10);
            pass = await bcrypt.hash(pass, salt);
            const user = await this.usersService.create({ email, password_hash: pass, full_name, phone_number });
            const payload = { sub: user.id, username: user.full_name, email: user.email };

            return {
                accessToken: await this.jwtService.signAsync(payload),
            };
        } catch (error) {
            throw new UnauthorizedException(error);
        }
    }

    async updatePassword(userId: string, newPassword: string): Promise<void> {
        try {
            const user = await this.usersService.findById(userId);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const salt = await bcrypt.genSalt(10);
            user.password_hash = await bcrypt.hash(newPassword, salt);

            await this.usersService.update(userId, user);
        } catch (error) {
            throw error;
        }

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
