export function daysDiff(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function getSmartPaymentLabel(
  paymentStatus: string,
  amountDue: number,
  paymentDueDate: Date | null
) {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "REFUNDED") return "REFUNDED";

  if (!paymentDueDate) {
    return paymentStatus === "PARTIALLY_PAID" ? "PARTIAL" : "PENDING";
  }

  const diff = daysDiff(new Date(), new Date(paymentDueDate));

  if (amountDue > 0 && diff < 0) return "OVERDUE";
  if (amountDue > 0 && diff <= 7) return "DUE SOON";
  if (paymentStatus === "PARTIALLY_PAID") return "PARTIAL";

  return "UNPAID";
}

export function getSubmissionStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    default:
      return status;
  }
}