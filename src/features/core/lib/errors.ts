import { ApplicationError, ApplicationTimeoutError } from "../../../shared/api";

export function coreErrorMessage(cause: unknown) {
  if (cause instanceof ApplicationError) return cause.message;
  if (cause instanceof ApplicationTimeoutError) {
    return "A operação não respondeu. Reinicie o aplicativo e tente novamente.";
  }
  return "Não foi possível acessar os dados locais. Tente novamente.";
}
