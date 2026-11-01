import {chatbotReply} from "../lib/ai" ;
import {messageRepository} from "../repositories/messageRepository"
const MAX_HISTORY = 20;
export const chatService = {
    async replyFromBot(clientId:string,text:string){
        const history = await messageRepository.listPrivateMessages(clientId,"chatbot",{limit:MAX_HISTORY});
        
        const aiMessage =[
    { role: "user" as "user", content: text },     
    ...history.map((m) => ({
        role: (m.senderId === "chatbot" ? "assistant" : "user") as "assistant" | "user",
        content: m.text
    }))
].reverse(); 

       const aiAnswer = await chatbotReply(aiMessage);
       const botRow = await messageRepository.createPrivateMessage("chatbot",clientId,aiAnswer); 
       return botRow;
}
}