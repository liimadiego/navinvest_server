import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class MailService {
    sendVerificationCodeMail(code: string, email: string, name: string): void {
        const brevo_base_url = process.env.BREVO_BASE_URL;
        const brevo_api_key = process.env.BREVO_API_KEY;
        const brevo_mail_sender = process.env.BREVO_MAIL_SENDER;

        fetch(`${brevo_base_url}/smtp/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': `${brevo_api_key}`,
            },
            body: JSON.stringify({
                "sender": {
                    "name": "Navinvest AI",
                    "email": brevo_mail_sender,
                },
                "to": [
                    {
                        "email": email,
                        "name": name
                    }
                ],
                "htmlContent": `<html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { background-color: #272727; margin: 0; font-family: Arial, sans-serif; }
                        .container { max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
                        h1 { color: #1a202c;margin-top: 0; }
                        .footer { margin-top: 40px; font-size: 12px; color: #777777; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a202c;border: 1px solid rgba(0, 0, 0.3);">
                            <tr>
                                <td align="center" valign="middle" style="padding: 10px; color: #ffffff;height: 80px">
                                    <table cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td>
                                                <img src="https://navinvest.ai/logo/logo-branco-single.png" width="38" style="display: block; margin-right: 8px;">
                                            </td>
                                            <td>
                                                <h2 style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, sans-serif;">Código de Verificação</h2>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="padding: 20px; border: 1px solid rgba(0, 0, 0.3); border-radius: 8px; border-top: none; border-top-right-radius: 0; border-top-left-radius: 0;transform: translateY(-18px);">
                        <h2 style="font-family: Arial, sans-serif; color: #1a202c; text-align: center;margin-top: 0;">Olá, ${name}!</h2>
                        <p style="font-family: Arial, sans-serif; color: #1a202c; text-align: center;">Seu código de verificação é:</p>
                        <h2 style="font-family: Arial, sans-serif; color: #1a202c; text-align: center; font-size: 24px; margin: 20px 0;margin-top: 0;">${code}</h2>
                        <p style="font-family: Arial, sans-serif; color: #1a202c; text-align: center;">Use este código para redefinir sua senha na plataforma Navinvest.</p>

                        </div>
                        
                        <p class="footer">Você está recebendo este email porque se cadastrou na Navinvest AI.</p>
                    </div>
                </body>
                </html>`,
                "subject": "Código de verificação",
            }),
        }).then(response => {
            if (!response.ok) {
                console.error(response.statusText, response.status);
                throw new Error('Network response was not ok');
            }
            return response.json();
        }).then(data => {
            console.log('Success:', data);
        }).catch(error => {
            console.error('Error:', error);
        });
    }

    sendDailyNewsMail(email: string, name: string, news: any, newsLinks: string): void {
        const brevo_base_url = process.env.BREVO_BASE_URL;
        const brevo_api_key = process.env.BREVO_API_KEY;
        const brevo_mail_sender = process.env.BREVO_MAIL_SENDER;

        const hasLinks = newsLinks.length > 0;

        fetch(`${brevo_base_url}/smtp/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': `${brevo_api_key}`,
            },
            body: JSON.stringify({
                "sender": {
                    "name": "Navinvest AI",
                    "email": brevo_mail_sender,
                },
                "to": [
                    {
                        "email": email,
                        "name": name
                    }
                ],
                "htmlContent": `<html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { background-color: #272727; margin: 0; font-family: Arial, sans-serif; }
                        .container { max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
                        h1 { color: #1a202c;margin-top: 0; }
                        .footer { margin-top: 40px; font-size: 12px; color: #777777; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a202c;border: 1px solid rgba(0, 0, 0.3);">
                            <tr>
                                <td align="center" valign="middle" style="padding: 10px; color: #ffffff;height: 80px">
                                    <table cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td>
                                                <img src="https://navinvest.ai/logo/logo-branco-single.png" width="38" style="display: block; margin-right: 8px;">
                                            </td>
                                            <td>
                                                <h2 style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, sans-serif;">Navi Diário</h2>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="padding: 20px; border: 1px solid rgba(0, 0, 0.3); border-radius: 8px; border-top: none; border-top-right-radius: 0; border-top-left-radius: 0;transform: translateY(-18px);">
                            <h1 style="font-family: Arial, sans-serif; color: #1a202c;">Olá, ${name}!</h1>
                            <p style="font-family: Arial, sans-serif; color: #1a202c;">Aqui estão as principais notícias do mercado financeiro de hoje:</p>
                            ${news}
                            ${hasLinks ? `<h3 style="font-family: Arial, sans-serif; color: #1a202c;">Fontes:</h3>${newsLinks}` : ''}
                        </div>
                        
                        <p class="footer">Você está recebendo este email porque se cadastrou na Navinvest AI.</p>
                    </div>
                </body>
                </html>
                `,
                "subject": "Navi Diário - Principais notícias do mercado financeiro",
            }),
        }).then(response => {
            if (!response.ok) {
                console.error(response.statusText, response.status);
                throw new Error('Network response was not ok');
            }
            return response.json();
        }).then(data => {
            console.log('Success:', data);
        }).catch(error => {
            console.error('Error:', error);
        });
    }
}