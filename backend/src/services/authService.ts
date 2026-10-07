import { AppError } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";
import { generateToken } from "../lib/token";
import { clientRepository } from "../repositories/clientRepository";
import { sessionRepository } from "../repositories/sessionRepository";
import { hub } from "../ws/hub";

const MAX_NAME_LENGTH = 24;
const MIN_PASSWORD_LENGTH = 8;
// Compared against when no such client exists, so a missing name takes
// roughly as long as a wrong password instead of leaking which name is taken.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Mo2gE1gV8dXtvzA6Apu8R.1NYmpXm";

function toClientDto(client: { id: string; name: string; online: boolean }) {
  return { id: client.id, name: client.name, online: client.online };
}

function validateCredentials(rawName: string, password: string) {
  const name = rawName.trim();
  if (!name) throw new AppError(400, "EMPTY_NAME", "Enter a name.");
  if (name.length > MAX_NAME_LENGTH) {
    throw new AppError(400, "NAME_TOO_LONG", "Keep your name under 24 characters.");
  }
  if (!password) throw new AppError(400, "EMPTY_PASSWORD", "Enter a password.");
  return name;
}

export const authService = {
  async register(rawName: string, password: string) {
    const name = validateCredentials(rawName, password);
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(
        400,
        "PASSWORD_TOO_SHORT",
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
    const existing = await clientRepository.findByNameCaseInsensitive(name);
    if (existing) {
      throw new AppError(409, "NAME_TAKEN", `"${name}" is already taken. Try another name.`);
    }
    const passwordHash = await hashPassword(password);
    const client = await clientRepository.create(name, passwordHash);
    const token = generateToken();
    await sessionRepository.create(token, client.id);
    const dto = toClientDto(client);
    // `presence` only patches a roster entry a client already knows about —
    // a brand new name needs the full record, not just an online flip.
    hub.broadcast("client", dto);
    return { token, client: dto };
  },

  async login(rawName: string, password: string) {
    const name = validateCredentials(rawName, password);
    const client = await clientRepository.findByNameCaseInsensitive(name);
    const valid = await verifyPassword(password, client?.passwordHash ?? DUMMY_HASH);
    if (!client || !valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect name or password.");
    }
    await clientRepository.setOnline(client.id, true);
    const token = generateToken();
    await sessionRepository.create(token, client.id);
    return { token, client: toClientDto(client) };
  },

  async logout(clientId: string, token: string) {
    // The socket's own close handler does this too — this is just the
    // explicit-logout path getting there first instead of waiting on FIN.
    await clientRepository.setOnline(clientId, false);
    hub.broadcast("presence", { clientId, online: false });
    await sessionRepository.deleteByToken(token);
  },
};
