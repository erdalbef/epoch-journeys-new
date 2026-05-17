"use client";

type Props = {
  tourId: string;
  tourTitle: string;
};

export default function ArchiveTourButton({ tourId, tourTitle }: Props) {
  return (
    <form
      action={`/api/tours/${tourId}/archive`}
      method="POST"
      onSubmit={(e) => {
        if (!window.confirm(`Archive "${tourTitle}"?`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm text-amber-600 hover:underline"
      >
        Archive
      </button>
    </form>
  );
}