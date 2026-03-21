import { NextResponse } from "next/server";
import config from "@/src/data/config.json";

export async function POST(req: Request) {
  const body = await req.json();

  const { name, phone, email, message } = body;

  const whatsappNumber = config.businessInfo.whatsappNumber;

  const text = `
📩 New Contact Request

👤 Name: ${name}
📞 Phone: ${phone}
📧 Email: ${email || "Not provided"}

💬 Message:
${message}
`;

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    text
  )}`;

  return NextResponse.json({
    success: true,
    redirectUrl: whatsappUrl,
  });
}
