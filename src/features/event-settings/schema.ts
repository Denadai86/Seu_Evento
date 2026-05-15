// src/features/event-settings/schema.ts
import { z } from "zod";

export const eventSettingsSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  ticketPrice: z.coerce.number().min(0, "O preço não pode ser negativo"),
});