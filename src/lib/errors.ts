import { ApplicationError, ApplicationTimeoutError } from "@/api";
import { RuntimeError } from "@/runtime";

export function applicationErrorMessage(cause: unknown) {
  if (cause instanceof ApplicationError) return cause.message;
  if (cause instanceof ApplicationTimeoutError) {
    return "A operação não respondeu. Reinicie o aplicativo e tente novamente.";
  }
  if (cause instanceof RuntimeError) return cause.message;
  return "Não foi possível acessar os dados locais. Tente novamente.";
}

export const coreErrorMessage = applicationErrorMessage;
