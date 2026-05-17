"use client";

type Props = {
  tourId: string;
  tourTitle: string;
};

export default function RepublishTourButton({ tourId, tourTitle }: Props) {
  return (
    <form
      action={`/api/tours/${tourId}/republish`}
      method="POST"
      onSubmit={(e) => {
        if (!window.confirm(`Republish "${tourTitle}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm text-green-600 hover:underline"
      >
        Republish
      </button>
    </form>
  );
}