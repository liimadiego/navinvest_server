import { Injectable } from '@nestjs/common';
import { SubscriptionDataReq, SubscriptionDataRes } from './checkout.interface';
import { UserEntity } from 'entities/user.entity';

@Injectable()
export class CheckoutService {
    async createSubscription(userId: string, data: SubscriptionDataReq, user: UserEntity): Promise<any> {
        const checkoutBaseUrl = process.env.CHECKOUT_BASE_URL;

        if (!checkoutBaseUrl) {
            throw new Error('Checkout base URL is not defined');
        }

        const subscriptionData = this.handleData(data);

        const response = await fetch(`${checkoutBaseUrl}/subscription/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create subscription: ${errorData.message}`);
        }

        const res = await response.json();

        if (!res.success) {
            throw new Error(`Failed to create subscription: ${res.message}`);
        }

        if (res.subscription.billingType === 'PIX') {
            return {
                success: true,
                billingType: res.subscription.billingType,
                qrCodeBase64: res.pix_info.qrCodeBase64,
                copyPaste: res.pix_info.copyPaste,
                expiresAt: res.pix_info.expires_at,
            };
        }

        if (res.subscription.billingType === 'CREDIT_CARD' && res.payment.status === 'PENDING') return { success: true };

        throw new Error(`Failed to create subscription: ${res.message}`);
    }

    handleData(data: SubscriptionDataReq): SubscriptionDataRes {
        const { general, creditCard, billingAddress } = data;

        const nextDueDate = new Date();

        if (general.paymentMethod === 'credit_card') {
            nextDueDate.setDate(nextDueDate.getDate() + 7);
        }

        const subscriptionData: SubscriptionDataRes = {
            general: {
                cycle_type: general.billingPreference === 'monthly' ? 'monthly' : 'yearly',
                billing_type: general.paymentMethod === 'credit_card' ? 'credit_card' : 'pix',
                next_due_date: nextDueDate.toISOString().split('T')[0]
            },
            customer: {
                name: general.fullName,
                email: general.email,
                cpfCnpj: general.cpf,
                address: billingAddress.streetAddress,
                addressNumber: billingAddress.addressNumber,
                complement: billingAddress.complement,
                province: billingAddress.neighborhood,
                postalCode: billingAddress.zipCode,
            },
        };

        if (general.paymentMethod === 'credit_card') {
            subscriptionData.paymentInfo = {
                creditCard: {
                    holderName: general.fullName,
                    number: creditCard.cardNumber || '',
                    expiryMonth: creditCard.expiryMonth || '',
                    expiryYear: creditCard.expiryYear || '',
                    ccv: creditCard.cvv || '',
                },
                creditCardHolderInfo: {
                    name: general.fullName,
                    email: general.email,
                    cpfCnpj: general.cpf,
                    postalCode: billingAddress.zipCode,
                    addressNumber: billingAddress.addressNumber,
                    addressComplement: billingAddress.complement,
                    phone: "11999999999"
                },
            };
        }

        return subscriptionData;
    }
}