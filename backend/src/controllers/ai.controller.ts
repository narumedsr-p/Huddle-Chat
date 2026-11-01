import type { Request, Response } from "express";
import { AUDIO_EXTENSIONS, speechToText } from "../lib/ai";
import { AppError } from "../lib/errors";

export const aiController = {
  async speechToText(req: Request, res: Response) {
    if (!req.file?.size) {
      throw new AppError(400, "EMPTY_AUDIO", "The recording is empty.");
    }
    const { buffer, mimetype } = req.file;
    const file = new File([buffer], `audio.${AUDIO_EXTENSIONS[mimetype]}`, { type: mimetype });
    const text = await speechToText(file);
    res.json({ text: text.trim() });
  },
};
