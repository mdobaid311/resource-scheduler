import { moveBooking } from "@/lib/bookings";
import { toDTO } from "@/lib/dto";
import { fail, parseSlot } from "@/lib/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slot = parseSlot(await request.json().catch(() => ({})));
  if (!slot) return Response.json({ error: "Invalid booking." }, { status: 400 });

  try {
    return Response.json(toDTO(await moveBooking(id, slot)));
  } catch (error) {
    return fail(error);
  }
}
