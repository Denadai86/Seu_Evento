// src/features/event-settings/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { eventSettingsSchema } from "./schema";

export async function updateEventSettings(eventId: string, formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const validated = eventSettingsSchema.safeParse(data);

  if (!validated.success) return { error: "Dados inválidos" };

  await prisma.event.update({
    where: { id: eventId },
    data: validated.data,
  });

  revalidatePath(`/dashboard/${eventId}`);
  return { success: true };
}