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
                    <head></head>
                    <body>
                        <h1>Olá, ${name}!</h1>
                        ${news}
                        <br>
                        ${hasLinks ? `<h3>Fontes:</h3>${newsLinks}` : ''}
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