import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Guard: both signature and secret must be present
  if (!signature || !webhookSecret) {
    console.warn("Webhook: missing signature or secret");
    return new NextResponse("Missing webhook credentials", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    // Log internally but return generic message to client
    console.error("Webhook signature verification failed:", error);
    return new NextResponse("Webhook signature verification failed", { status: 400 });
  }

  const session = event.data.object as any;

  if (event.type === "checkout.session.completed") {
    // Guard: session.subscription can be null for one-time payments
    if (!session.subscription) {
      console.log("checkout.session.completed: no subscription (one-time payment), skipping.");
      return new NextResponse(null, { status: 200 });
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const userId = session.metadata?.userId;
      const charityId = session.metadata?.charityId;
      const charityPct = parseInt(session.metadata?.charityPct || "10", 10);

      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            sub_status: subscription.status,
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            charity_name: charityId,
            charity_pct: charityPct,
          })
          .eq("id", userId);

        if (error) console.error("Error updating profile in webhook:", error);
      }
    } catch (err) {
      console.error("checkout.session.completed handler error:", err);
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    // Guard: subscription might be null for one-time invoices
    if (!session.subscription) {
      console.log("invoice.payment_succeeded: no subscription, skipping.");
      return new NextResponse(null, { status: 200 });
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await supabase
        .from("profiles")
        .update({
          sub_status: subscription.status,
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    } catch (err) {
      console.error("invoice.payment_succeeded handler error:", err);
    }
  }

  return new NextResponse(null, { status: 200 });
}
