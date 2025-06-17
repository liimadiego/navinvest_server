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
                "htmlContent": `<html><head></head><body><h1>Olá, ${name}!</h1><p>Seu código de verificação é: <strong>${code}</strong></p></body></html>`,
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
                            body { background-color: #f4f4f4; margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                            .container { max-width: 600px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
                            h1 { color: #1a202c; }
                            .footer { margin-top: 40px; font-size: 12px; color: #777777; text-align: center; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Olá, ${name}!</h1>
                            <p>Aqui estão as principais notícias do mercado financeiro de hoje:</p>
                            ${news}
                            ${hasLinks ? `<h3>Fontes:</h3>${newsLinks}` : ''}
                            <p class="footer">Você está recebendo este email porque se cadastrou na Navinvest AI.</p>
                        </div>
                    </body>
                </html>`,
                "subject": "Notícias do dia",
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