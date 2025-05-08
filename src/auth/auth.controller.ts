import { Body, Controller, Post, HttpCode, HttpStatus, UnauthorizedException, BadRequestException, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'decorators/public.decorator';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    signIn(@Body() body: any): Promise<any> {
        const { email, password } = body;

        if (!email || !password) {
            throw new BadRequestException('Email and password are required');
        }

        try {
            return this.authService.signIn(email, password);
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials');
        }
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('register')
    signUp(@Body() body: any): Promise<any> {
        const { email, password, full_name, phone_number } = body;

        if (!email || !password || !full_name || !phone_number) {
            throw new BadRequestException('All fields are required');
        }

        try {
            return this.authService.signUp(email, password, full_name, phone_number);
        } catch (error) {
            throw new UnauthorizedException('Registration failed');
        }
    }

    //mexer aqui, deve ser pelo esquema de enviar email, gerar link e depois o usuário clicar no link para atualizar a senha
    @HttpCode(HttpStatus.OK)
    @Post('update-password')
    async updatePassword(@Body() body: any): Promise<any> {
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
            throw new BadRequestException('User ID and new password are required');
        }

        try {
            return this.authService.updatePassword(userId, newPassword);
        } catch (error) {
            throw new UnauthorizedException('Password update failed');
        }
    }

    @HttpCode(HttpStatus.OK)
    @Get('me')
    async getMe(@Req() request: Request): Promise<any> {
        const token = await this.authService.getTokenFromRequest(request);

        if (!token) {
            throw new BadRequestException('Token is required');
        }

        try {
            return this.authService.getUserFromToken(token);
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}