import * as auth from "./auth";
import * as clients from "./clients";
import * as groups from "./groups";
import * as rooms from "./rooms";

export const api = {
  ...auth,
  ...clients,
  ...groups,
  ...rooms,
};

export { ApiError, hasToken, getToken } from "./client";
export type { ApiClient, ApiGroup, ApiMessage, ApiTyper } from "./types";
