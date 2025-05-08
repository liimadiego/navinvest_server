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