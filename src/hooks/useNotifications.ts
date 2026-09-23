import { createContext, useContext } from "react";

export type NotificationTone = "error" | "success";
export type Notify = (message: string, tone?: NotificationTone) => void;

export const NotificationContext = createContext<Notify>(() => undefined);

export function useNotifications() {
  return useContext(NotificationContext);
}
