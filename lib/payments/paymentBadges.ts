export function getSmartPaymentClass(label: string) {
  switch (label) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "OVERDUE":
      return "bg-red-100 text-red-700";
    case "DUE SOON":
      return "bg-amber-100 text-amber-700";
    case "PARTIAL":
      return "bg-blue-100 text-blue-700";
    case "REFUNDED":
      return "bg-slate-100 text-slate-700";
    case "PENDING":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function getSubmissionStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}