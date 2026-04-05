export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold text-[#001F3F]">
        Terms & Conditions
      </h1>

      <p className="mt-4 text-sm text-gray-500">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="mt-8 space-y-4 text-sm leading-7">
        <p>
          These Terms & Conditions govern your use of the Epoch Journeys website
          and services.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          B2B Platform
        </h2>
        <p>
          Epoch Journeys operates as a business-to-business (B2B) platform,
          working exclusively with travel advisors, agencies, and group
          organizers.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Use of Services
        </h2>
        <p>
          By using our website, you agree to use our services only for lawful
          business purposes and in accordance with these terms.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Accuracy of Information
        </h2>
        <p>
          We aim to ensure all information is accurate; however, we do not
          guarantee completeness or accuracy at all times.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Liability
        </h2>
        <p>
          Epoch Journeys is not liable for indirect or consequential damages
          arising from the use of this website or services.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Changes
        </h2>
        <p>
          We reserve the right to update these Terms at any time without prior
          notice.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Contact
        </h2>
        <p>
          For any questions, please contact:
          <br />
          <a
            href="mailto:info@epochjourneys.com"
            className="text-[#8B0000] underline"
          >
            info@epochjourneys.com
          </a>
        </p>
      </section>
    </main>
  );
}