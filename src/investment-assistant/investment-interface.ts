export interface MessageHistoric {
    role: "system" | "user" | "assistant" | "developer";
    content: string;
}