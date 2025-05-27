export type SubscriptionDataReq = {
    general: {
        email: string;
        fullName: string;
        cpf: string;
        billingPreference: string;
        paymentMethod: string;
        nextDueDate: string;
        phone?: string;
        password?: string;
    };
    creditCard: {
        cardNumber: string | null;
        expiryMonth: string | null;
        expiryYear: string | null;
        cvv: string | null;
    };
    billingAddress: {
        streetAddress: string;
        zipCode: string;
        addressNumber: string;
        complement?: string;
        neighborhood: string;
    };
}

export type SubscriptionDataRes = {
    general: {
        cycle_type: 'monthly' | 'yearly';
        billing_type: 'credit_card' | 'pix';
        next_due_date: string;
    }
    customer: {
        name: string;
        email: string;
        cpfCnpj: string;
        address: string;
        addressNumber: string;
        complement?: string;
        province: string;
        postalCode: string;
    };
    paymentInfo?: {
        creditCard?: {
            holderName: string;
            number: string;
            expiryMonth: string;
            expiryYear: string;
            ccv: string;
        };
        creditCardHolderInfo?: {
            name: string;
            email: string;
            cpfCnpj: string;
            postalCode: string;
            addressNumber: string;
            phone?: string;
            addressComplement?: string;
        };
    };
}