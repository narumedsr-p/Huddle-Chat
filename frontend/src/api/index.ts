import * as clients from "./clients";
import * as groups from "./groups";
import * as rooms from "./rooms";
import * as sessions from "./sessions";

export const api = {
  ...sessions,
  ...clients,
  ...groups,
  ...rooms,
};

export { ApiError } from "./client";
export type { ApiClient, ApiGroup, ApiMessage, ApiTyper } from "./types";
