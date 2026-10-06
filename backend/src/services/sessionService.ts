import { AppError } from "../lib/errors";
import { generateToken } from "../lib/token";
import { clientRepository } from "../repositories/clientRepository";
import { sessionRepository } from "../repositories/sessionRepository";

const MAX_NAME_LENGTH = 24;

export const sessionService = {
  async join(rawName: string) {
    const name = rawName.trim();
    if (!name) throw new AppError(400, "EMPTY_NAME", "Enter a name to join the chat.");
    if (name.length > MAX_NAME_LENGTH) {
      throw new AppError(400, "NAME_TOO_LONG", "Keep your name under 24 characters.");
    }
    const existing = await clientRepository.findByNameCaseInsensitive(name);
    if (existing) {
      throw new AppError(409, "NAME_TAKEN", `"${name}" is already taken. Try another name.`);
    }
    const client = await clientRepository.create(name);
    const token = generateToken();
    await sessionRepository.create(token, client.id);
    return { token, client: { id: client.id, name: client.name, online: client.online } };
  },

  async logout(clientId: string, token: string) {
    await clientRepository.setOnline(clientId, false);
    await sessionRepository.deleteByToken(token);
  },

  async heartbeat(clientId: string) {
    await clientRepository.heartbeat(clientId);
  },
};
