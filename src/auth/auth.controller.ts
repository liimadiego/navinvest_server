import { Body, Controller, Post, HttpCode, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

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
}