import type {Request,Response} from "express" 
import type {AuthedRequest} from "../middleware/auth"
import {chatService} from "../services/chatbotService"

export const chatbotController = {
    async writeToChatbot(req: Request, res: Response){
        const authreq = req as AuthedRequest;
        const answer = await chatService.replyFromBot(authreq.client.id,authreq.body.text);
        res.status(201).json({answer});
    }
}