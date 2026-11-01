import { apiFetch } from "./client";

export function askChatbot(text: string){
    return apiFetch<{answer:string}>("/chatbot",{
        method:"POST",
        body: JSON.stringify({ text: text})
    });
}