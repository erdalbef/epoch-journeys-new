export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold text-[#001F3F]">
        Privacy Policy
      </h1>

      <p className="mt-4 text-sm text-gray-500">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <section className="mt-8 space-y-4 text-sm leading-7">
        Epoch Journeys OOD (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) respects your privacy and is

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Information We Collect
        </h2>
        <p>
          We may collect personal information such as your name, email address,
          company details, and any information you provide through our contact
          or partnership forms.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          How We Use Your Information
        </h2>
        <p>
          We use your information to respond to inquiries, manage partnerships,
          and improve our services. We do not sell or share your personal data
          with third parties for marketing purposes.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Data Protection
        </h2>
        <p>
          We take appropriate technical and organizational measures to protect
          your personal data against unauthorized access or disclosure.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Your Rights
        </h2>
        <p>
          You have the right to request access, correction, or deletion of your
          personal data. You may contact us at any time regarding your data.
        </p>

        <h2 className="font-semibold text-lg text-[#001F3F]">
          Contact
        </h2>
        <p>
          If you have any questions about this policy, please contact us at:
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