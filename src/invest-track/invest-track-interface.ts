export interface UserAction {
    action: "registered_information" | "alert_created";
    transaction_type: "buy" | "sell";
    asset: string;
    asset_value: number;
    bought_for?: number;
    context?: Context;
}

interface Context {
    current_asset_value: number;
}