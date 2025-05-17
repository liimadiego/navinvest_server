import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtHelper {
  constructor(private readonly jwtService: JwtService) { }

  async extractUserIdFromRequest(request: any): Promise<string | null> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const decoded = this.jwtService.decode(token) as { sub: string; email: string };

    return decoded?.sub || null;
  }
}