import { Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  @Post('local-logout')
  @HttpCode(HttpStatus.OK)
  localLogout(@Res() res: Response) {
    res.clearCookie('erp_access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: 'erp.zonadev.tech',
      path: '/',
    });

    return res.json({ success: true });
  }
}
