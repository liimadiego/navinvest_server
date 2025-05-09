import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ResetPasswordCodeEntity } from 'entities/reset-password-codes.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from 'utils/mail.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService,
        @InjectRepository(ResetPasswordCodeEntity)
        private resetPasswordCodeRepository: Repository<ResetPasswordCodeEntity>,
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

    async updatePassword(email: string, newPassword: string, code: string): Promise<any> {
        try {
            const resetPasswordCode = await this.resetPasswordCodeRepository.findOne({ where: { code } });
            if (!resetPasswordCode || resetPasswordCode.expires_at < new Date()) {
                console.log('Invalid or expired code');
                throw new UnauthorizedException('Invalid or expired code');
            }

            const user = await this.usersService.findOne(email);
            if (!user || user.id !== resetPasswordCode.user_id) {
                console.log('Invalid email or code');
                throw new UnauthorizedException('Invalid email or code');
            }

            const salt = await bcrypt.genSalt(10);
            user.password_hash = await bcrypt.hash(newPassword, salt);

            await this.usersService.updatePassword(user.id, user.password_hash);

            await this.resetPasswordCodeRepository.delete(resetPasswordCode.id);

            // this.mailService.sendVerificationCodeMail('Password updated successfully', email, user.full_name);
            return { success: true, message: 'Password updated successfully' };
        } catch (error) {
            console.error('Error updating password:', error);
            throw new UnauthorizedException('Error updating password');
        }

    }

    async resetPassword(email: string): Promise<void> {
        try {
            const user = await this.usersService.findOne(email);
            if (!user) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return;
            }

            const userMail = user.email;
            const userId = user.id;
            const userName = user.full_name;

            const code = this.generateResetPasswordCode(6);
            await this.saveResetPasswordCode(userId, code);

            if (!userMail || !userName || !code) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return;
            }

            this.mailService.sendVerificationCodeMail(code, userMail, userName);

            console.log(`Reset password code for ${email}: ${code}`);
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

    generateResetPasswordCode(codeLength: number): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < codeLength; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return code;
    }

    async saveResetPasswordCode(userId: string, code: string): Promise<void> {
        const resetPasswordCode = new ResetPasswordCodeEntity();
        resetPasswordCode.user_id = userId;
        resetPasswordCode.code = code;
        resetPasswordCode.expires_at = new Date(Date.now() + 3600000);

        await this.resetPasswordCodeRepository.save(resetPasswordCode);
    }
}
