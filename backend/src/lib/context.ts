import type { users } from "../../database/schema.ts";

export type AppUser = typeof users.$inferSelect;

export type AppVariables = {
  userId: string;
  userRole: "customer" | "worker" | "admin" | "super_admin";
  user: AppUser;
};
