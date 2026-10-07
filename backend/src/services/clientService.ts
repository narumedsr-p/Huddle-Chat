import { AppError } from "../lib/errors";
import { clientRepository } from "../repositories/clientRepository";

export const clientService = {
  async list() {
    const clients = await clientRepository.findAll();
    return clients.map((c) => ({ id: c.id, name: c.name, online: c.online }));
  },

  async getById(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found.");
    return { id: client.id, name: client.name, online: client.online };
  },
};
