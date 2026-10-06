import { clientRepository } from "../repositories/clientRepository";

export const clientService = {
  async list() {
    const clients = await clientRepository.findAll();
    return clients.map((c) => ({ id: c.id, name: c.name, online: c.online }));
  },
};
