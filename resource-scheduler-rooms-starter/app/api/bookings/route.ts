import { createBooking } from "@/lib/bookings";
import { toDTO } from "@/lib/dto";
import { fail, parseSlot } from "@/lib/http";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const slot = parseSlot(body);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!slot || !title) return Response.json({ error: "Invalid booking." }, { status: 400 });

  try {
    return Response.json(toDTO(await createBooking({ ...slot, title })), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
