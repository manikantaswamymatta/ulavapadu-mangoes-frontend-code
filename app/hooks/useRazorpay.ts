import { useEffect } from "react";

declare global {
  interface RazorpayErrorPayload {
    error?: {
      description?: string;
    };
  }

  interface RazorpayPaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  interface RazorpayInstance {
    open: () => void;
    on: (event: string, callback: (payload: RazorpayErrorPayload) => void) => void;
  }

  interface RazorpayConstructor {
    new (options: Record<string, unknown>): RazorpayInstance;
  }

  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

export function useRazorpay(orderAmount: number, customerName: string, customerPhone: string) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  function openRazorpay(
    paymentId: string,
    keyId?: string,
    onPaymentSuccess?: (response: RazorpayPaymentResponse) => void,
    onPaymentFailedOrCancelled?: (message: string) => void
  ): boolean {
    const paymentFailedMessage =
      "Payment Failed\n" +
      "The payment was not completed because it was cancelled." +
      "If any amount was debited from your account, it will be automatically refunded within 3-4 working days.\n\n" +
      "Please try the payment again or contact support if the issue persists.";

    if (!paymentId) {
      alert("Unable to start payment: missing Razorpay order id.");
      return false;
    }

    if (typeof window === "undefined" || !window.Razorpay) {
      alert("Payment SDK is not loaded. Please refresh and try again.");
      return false;
    }

    const resolvedKeyId = keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!resolvedKeyId) {
      alert("Razorpay key is not configured. Please contact support.");
      return false;
    }

    let isCompleted = false;

    const options = {
      key: resolvedKeyId,
      amount: orderAmount * 100,
      currency: "INR",
      name: "Ulavapadu Mangoes",
      description: "Order Payment",
      order_id: paymentId,
      redirect: false,
      handler: function (response: RazorpayPaymentResponse) {
        isCompleted = true;
        if (onPaymentSuccess) {
          onPaymentSuccess(response);
          return;
        }
        alert("Payment successful! Payment ID: " + response.razorpay_payment_id);
      },
      prefill: {
        name: customerName,
        contact: customerPhone,
      },
      theme: {
        color: "#F37254",
      },
      modal: {
        ondismiss: function () {
          if (isCompleted) {
            return;
          }
          if (onPaymentFailedOrCancelled) {
            onPaymentFailedOrCancelled(paymentFailedMessage);
            return;
          }
          alert(paymentFailedMessage);
        },
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response: RazorpayErrorPayload) => {
      isCompleted = true;
      const reason = response?.error?.description;
      const message = reason ? `${paymentFailedMessage}\n\nReason: ${reason}` : paymentFailedMessage;
      if (onPaymentFailedOrCancelled) {
        onPaymentFailedOrCancelled(message);
        return;
      }
      alert(message);
    });
    rzp.open();
    return true;
  }

  return { openRazorpay };
}
