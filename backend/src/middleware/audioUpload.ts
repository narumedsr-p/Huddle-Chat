import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { isSupportedAudio, MAX_AUDIO_BYTES } from "../lib/ai";
import { AppError } from "../lib/errors";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (isSupportedAudio(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(415, "UNSUPPORTED_AUDIO", "This audio format isn't supported."));
    }
  },
}).single("audio");

export function audioUpload(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (err: unknown) => {
    if (!err || err instanceof AppError) {
      next(err);
    } else if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      next(new AppError(413, "AUDIO_TOO_LARGE", "This recording is too large."));
    } else {
      next(new AppError(400, "INVALID_AUDIO", "Send the recording as the \"audio\" form field."));
    }
  });
}
