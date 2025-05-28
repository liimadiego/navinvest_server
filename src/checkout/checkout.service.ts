import { Injectable } from '@nestjs/common';
import { SubscriptionDataReq, SubscriptionDataRes, updateSubscription } from './checkout.interface';
import { UserEntity } from 'entities/user.entity';
import { UsersService } from 'users/users.service';

@Injectable()
export class CheckoutService {
    constructor(private readonly usersService: UsersService) { }

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

        await this.usersService.savePaymentSubscriptionId(userId, res.subscription.id);

        if (!res.success) {
            throw new Error(`Failed to create subscription: ${res.message}`);
        }

        if (res.subscription.billingType === 'PIX') {
            return {
                paymentId: res.payment.id,
                success: true,
                billingType: res.subscription.billingType,
                qrCodeBase64: res.pix_info.qrCodeBase64,
                copyPaste: res.pix_info.copyPaste,
                expiresAt: res.pix_info.expires_at,
            };
        }

        if (res.subscription.billingType === 'CREDIT_CARD' && res.payment.status === 'PENDING') {
            const updatedUser = await this.usersService.makeUserPremium(userId, 'premium', subscriptionData.general.cycle_type, true);

            if (!updatedUser) {
                throw new Error('Failed to update user to premium status');
            }

            return { success: true };
        }

        throw new Error(`Failed to create subscription: ${res.message}`);
    }

    async updateSubscription(data: updateSubscription): Promise<any> {
        const { subscriptionId, event, status, isTheLastPaymentOverdue, nextDueDate } = data;

        const user = await this.usersService.findUserByCheckoutSubscriptionId(subscriptionId);

        if (!user) {
            console.error(`User not found for subscription ID: ${subscriptionId}`);
            console.log('payload', data);
            throw new Error('User not found for the given subscription ID');
        }

        // if (isTheLastPaymentOverdue) {
        //     await this.usersService.update(user.id, { checkoutSubscriptionStatus: 'overdue' });
        //     console.log(`User ${user.id} subscription is overdue`);
        //     return;
        // }

        if (event === 'PAYMENT_OVERDUE') {
            await this.usersService.update(user.id, { checkoutSubscriptionStatus: 'overdue' });
            console.log(`User ${user.id} subscription is overdue :/`);
            return;
        }

        if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            await this.usersService.update(user.id, {
                checkoutSubscriptionStatus: status
            });
            console.log(`User ${user.id} subscription status updated to ${status}`);

            if (status === 'CONFIRMED' || status === 'RECEIVED') {
                const updatedUser = await this.usersService.makeUserPremium(user.id, 'premium', 'monthly', false);
                if (!updatedUser) {
                    console.error('Failed to update user to premium status');
                    throw new Error('Failed to update user to premium status');
                }
            }
            return;
        }

        return;

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

    async verifySubscription(userId: string): Promise<any> {
        if (!userId) {
            throw new Error('User ID is required to verify subscription');
        }

        const user = await this.usersService.findById(userId);

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        return await this.usersService.isUserPremium(userId);
    }
}