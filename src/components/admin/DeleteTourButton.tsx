"use client";

type Props = {
  tourId: string;
  tourTitle: string;
};

export default function DeleteTourButton({ tourId, tourTitle }: Props) {
  return (
    <form
      action={`/api/tours/${tourId}/delete`}
      method="POST"
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${tourTitle}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm text-red-600 hover:underline"
      >
        Delete
      </button>
    </form>
  );
}