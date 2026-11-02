import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../lib/errors";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (file.mimetype in AUDIO_EXTENSIONS) {
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
