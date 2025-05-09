import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class MailService {
    sendVerificationCodeMail(code: string, email: string, name: string): void {
        const brevo_base_url = process.env.BREVO_BASE_URL;
        const brevo_api_key = process.env.BREVO_API_KEY;

        fetch(`${brevo_base_url}/smtp/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': brevo_api_key,
            },
            body: JSON.stringify({
                "sender": {
                    "name": "Navinvest AI",
                    "email": process.env.BREVO_MAIL_SENDER,
                },
                "to": [
                    {
                        "email": email,
                        "name": name
                    }
                ],
                "htmlContent": `<!DOCTYPE html><html><head></head><body><h1>Olá, Jimmy!</h1><p>Seu código de verificação é: <strong>${code}</strong></p></body></html>`,
                "subject": "Código de verificação",
            }),
        }).then(response => {
            if (!response.ok) {
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