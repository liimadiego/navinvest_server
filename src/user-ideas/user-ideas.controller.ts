import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { UserIdeasService } from './user-ideas.service';
import { JwtHelper } from 'utils/jwt.service';

@Controller('user-ideas')
export class UserIdeasController {
    constructor(
        private readonly userIdeasService: UserIdeasService,
        private readonly jwtHelper: JwtHelper,
    ) {}

    @Post('create')
    async createIdea(@Body() body: { title: string; description: string }, @Req() request: any) {
        const userId = await this.jwtHelper.extractUserIdFromRequest(request);
        const { title, description } = body;

        if (!title || !description) {
            throw new HttpException('Campos title e description são obrigatórios.', HttpStatus.BAD_REQUEST);
        }

        const idea = await this.userIdeasService.saveIdea(userId, title, description);
        return { success: true, data: idea };
    }
}
