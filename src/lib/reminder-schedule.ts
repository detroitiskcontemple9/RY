import type { Pledge } from "@/db/schema";
import { addDays } from "./dates";

type ReminderState = Pick<Pledge, "status" | "dueDate" | "reminderBeforeSentAt" | "reminderDueSentAt" | "reminderOverdueSentAt">;

/**
 * Which automatic reminder (if any) is due today. Schedule: 7 days before,
 * on the due date, and 7 days after. Only the latest applicable one is sent,
 * so a pledge made 2 days before its due date skips the "7 days before" email.
 */
export function dueReminder(p: ReminderState, today: string): "before" | "due" | "overdue" | null {
  if (p.status !== "open") return null;
  if (today >= addDays(p.dueDate, 7)) return p.reminderOverdueSentAt ? null : "overdue";
  if (today >= p.dueDate) return p.reminderDueSentAt ? null : "due";
  if (today >= addDays(p.dueDate, -7)) return p.reminderBeforeSentAt ? null : "before";
  return null;
}
