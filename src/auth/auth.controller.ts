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

    @HttpCode(HttpStatus.OK)
    @Post('update-password')
    async updatePassword(@Body() body: any): Promise<any> {
        const { email, newPassword, code } = body;

        if (!email || !newPassword || !code) {
            throw new BadRequestException('Mail, code and new password are required');
        }

        try {
            return this.authService.updatePassword(email, newPassword, code);
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

    //resetPassword
    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('reset-password')
    async resetPassword(@Body() body: any): Promise<any> {
        const { email } = body;

        if (!email) {
            throw new BadRequestException('Email is required');
        }

        try {
            return this.authService.resetPassword(email);
        } catch (error) {
            throw new UnauthorizedException('Reset password failed');
        }
    }
}