"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type Journey = {
  id: string;
  title: string;
  subtitle: string | null;
  destinations: string[];
  duration: number;
  startingPrice: number | null;
  currency: string;
  startingPriceBasis: string;
  referenceGroupSize: number | null;
  hotelStandard: string | null;
  massIncluded: boolean;
};

type FormState = {
  requestType: "TAILOR_MADE" | "BESPOKE_GROUP";

  title: string;
  destination: string;
  destinations: string;

  startDate: string;
  alternativeStartDate: string;
  endDate: string;
  datesFlexible: boolean;
  durationDays: string;

  estimatedPax: string;
  adults: string;
  children: string;
  infants: string;

  groupName: string;
  groupLeaderName: string;
  complimentaryPlaces: string;

  singleRooms: string;
  doubleRooms: string;
  twinRooms: string;
  tripleRooms: string;

  priestTraveling: boolean;
  dailyMassRequested: boolean;
  specialChurchRequests: string;
  guideLanguage: string;

  budgetPerPerson: string;
  totalBudget: string;
  currency: string;

  accommodationLevel: string;

  needsFlights: boolean;
  landOnly: boolean;

  extensionRequest: string;

  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  specialRequests: string;
  notes: string;
};

type AgentContext = { agency: string | null; name: string | null; email: string | null };

type SubmitResponse = {
  success?: boolean;
  id?: string;
  requestReference?: string;
  error?: string;

  request?: {
    id?: string;
    requestReference?: string;
  };
};

const initialForm: FormState = {
  requestType: "TAILOR_MADE",

  title: "",
  destination: "",
  destinations: "",

  startDate: "",
  alternativeStartDate: "",
  endDate: "",
  datesFlexible: false,
  durationDays: "",

  estimatedPax: "",
  adults: "",
  children: "",
  infants: "",

  groupName: "",
  groupLeaderName: "",
  complimentaryPlaces: "",

  singleRooms: "",
  doubleRooms: "",
  twinRooms: "",
  tripleRooms: "",

  priestTraveling: false,
  dailyMassRequested: true,
  specialChurchRequests: "",
  guideLanguage: "English",

  budgetPerPerson: "",
  totalBudget: "",
  currency: "EUR",

  accommodationLevel: "",

  needsFlights: false,
  landOnly: true,

  extensionRequest: "",

  companyName: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",

  specialRequests: "",
  notes: "",
};

function formatMoney(
  value: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      },
    ).format(value);
  } catch {
    return `${value.toFixed(0)} ${currency}`;
  }
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-2 block text-sm font-semibold text-slate-700">
      {children}

      {required ? (
        <span className="ml-1 text-[#8B0000]">
          *
        </span>
      ) : null}
    </span>
  );
}

function SectionTitle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#001F3F] text-xs font-bold text-white">
          {number}
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#001F3F]">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function NewCustomRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tourId =
    searchParams.get("tourId");

  const [form, setForm] =
    useState<FormState>(initialForm);

  const [journey, setJourney] =
    useState<Journey | null>(null);

  const [journeyLoading, setJourneyLoading] =
    useState(Boolean(tourId));

  const [loading, setLoading] =
    useState(false);

  const [spiritualOpen, setSpiritualOpen] = useState(false);
  const [departureAirport, setDepartureAirport] = useState("");
  const [massPreference, setMassPreference] = useState("daily");
  const [priestPreference, setPriestPreference] = useState("unknown");
  const [travelPeriod, setTravelPeriod] = useState("");
  const [travelDateMode, setTravelDateMode] = useState<"dates" | "month" | "undecided">("month");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");

  const [agentContext, setAgentContext] = useState<AgentContext | null>(null);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10";

  useEffect(() => {
    let active = true;
    fetch("/api/b2b/quote-request-context", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Agent context unavailable");
        return response.json() as Promise<AgentContext>;
      })
      .then((data) => { if (active) setAgentContext(data); })
      .catch(() => { /* Quote request remains available if profile lookup fails. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!tourId) {
      setJourney(null);
      setJourneyLoading(false);

      setForm((prev) => ({
        ...prev,
        requestType: "TAILOR_MADE",
      }));

      return;
    }

    let active = true;

    async function loadJourney() {
      try {
        setJourneyLoading(true);
        setError("");

        const response = await fetch(
          `/api/b2b/tours/${tourId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load the selected journey.",
          );
        }

        const data =
          (await response.json()) as {
            tour?: Journey;
            journey?: Journey;
          };

        const selectedJourney =
          data.tour ??
          data.journey ??
          null;

        if (!selectedJourney) {
          throw new Error(
            "Selected journey could not be found.",
          );
        }

        if (!active) {
          return;
        }

        setJourney(selectedJourney);

        setForm((prev) => ({
          ...prev,

          requestType:
            "BESPOKE_GROUP",

          title:
            selectedJourney.title,

          destination:
            selectedJourney.destinations[0] ??
            "",

          destinations:
            selectedJourney.destinations.join(
              ", ",
            ),

          durationDays:
            String(
              selectedJourney.duration,
            ),

          currency:
            selectedJourney.currency ||
            "EUR",

          accommodationLevel:
            selectedJourney.hotelStandard ??
            prev.accommodationLevel,

          dailyMassRequested:
            selectedJourney.massIncluded,
        }));
      } catch (loadError) {
        console.error(
          "LOAD_JOURNEY_ERROR",
          loadError,
        );

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the selected journey.",
          );
        }
      } finally {
        if (active) {
          setJourneyLoading(false);
        }
      }
    }

    void loadJourney();

    return () => {
      active = false;
    };
  }, [tourId]);

  function handleChange(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >,
  ) {
    const {
      name,
      value,
      type,
    } = event.target;

    if (type === "checkbox") {
      const checked =
        (
          event.target as HTMLInputElement
        ).checked;

      if (
        name === "needsFlights"
      ) {
        setForm((prev) => ({
          ...prev,
          needsFlights: checked,
          landOnly: checked
            ? false
            : prev.landOnly,
        }));

        return;
      }

      if (
        name === "landOnly"
      ) {
        setForm((prev) => ({
          ...prev,
          landOnly: checked,
          needsFlights: checked
            ? false
            : prev.needsFlights,
        }));

        return;
      }

      setForm((prev) => ({
        ...prev,
        [name]: checked,
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (
        !journey &&
        !form.destination.trim()
      ) {
        setError(
          "Please enter the main destination.",
        );

        return;
      }

      if (
        !form.estimatedPax ||
        Number(form.estimatedPax) < 1
      ) {
        setError(
          "Please enter the estimated number of pilgrims.",
        );

        return;
      }

      const payload = {
        tourId:
          journey?.id ??
          tourId ??
          null,

        requestType:
          journey
            ? "BESPOKE_GROUP"
            : form.requestType,

        title:
          journey?.title ??
          form.title.trim() ??
          null,

        destination:
          journey?.destinations[0] ??
          form.destination.trim() ??
          null,

        destinations:
          journey
            ? journey.destinations.join(
                ",",
              )
            : form.destinations.trim(),

        startDate:
          travelDateMode === "dates" ? (travelStart || null) : null,

        alternativeStartDate:
          form.alternativeStartDate ||
          null,

        endDate:
          travelDateMode === "dates" ? (travelEnd || null) : null,

        datesFlexible:
          travelDateMode !== "dates",

        durationDays:
          form.durationDays
            ? Number(
                form.durationDays,
              )
            : null,

        estimatedPax:
          form.estimatedPax
            ? Number(
                form.estimatedPax,
              )
            : null,

        adults:
          form.adults
            ? Number(form.adults)
            : null,

        children:
          form.children
            ? Number(form.children)
            : null,

        infants:
          form.infants
            ? Number(form.infants)
            : null,

        groupName:
          form.groupName.trim() ||
          null,

        groupLeaderName:
          form.groupLeaderName.trim() ||
          null,

        complimentaryPlaces:
          form.complimentaryPlaces
            ? Number(
                form.complimentaryPlaces,
              )
            : 0,

        singleRooms:
          form.singleRooms
            ? Number(
                form.singleRooms,
              )
            : 0,

        doubleRooms:
          form.doubleRooms
            ? Number(
                form.doubleRooms,
              )
            : 0,

        twinRooms:
          form.twinRooms
            ? Number(
                form.twinRooms,
              )
            : 0,

        tripleRooms:
          form.tripleRooms
            ? Number(
                form.tripleRooms,
              )
            : 0,

        priestTraveling: priestPreference === "yes",

        dailyMassRequested: massPreference === "daily",

        specialChurchRequests:
          form.specialChurchRequests.trim() ||
          null,

        guideLanguage:
          form.guideLanguage.trim() ||
          null,

        budgetPerPerson:
          form.budgetPerPerson
            ? Number(
                form.budgetPerPerson,
              )
            : null,

        totalBudget:
          form.totalBudget
            ? Number(
                form.totalBudget,
              )
            : null,

        currency:
          form.currency,

        accommodationLevel:
          form.accommodationLevel.trim() ||
          null,

        needsFlights:
          form.needsFlights,

        landOnly:
          form.landOnly,

        extensionRequest:
          form.extensionRequest.trim() ||
          null,

        companyName:
          form.companyName.trim() ||
          null,

        customerName:
          form.customerName.trim() ||
          null,

        customerEmail:
          form.customerEmail.trim() ||
          null,

        customerPhone:
          form.customerPhone.trim() ||
          null,

        specialRequests:
          form.specialRequests.trim() ||
          null,

        notes: [
          travelDateMode === "dates" && travelStart
            ? `Preferred travel dates: ${travelStart}${travelEnd ? ` to ${travelEnd}` : ""}`
            : travelDateMode === "month" && travelPeriod
              ? `Preferred travel month: ${travelPeriod}`
              : "Preferred travel dates: To be confirmed",
          spiritualOpen ? `Mass preference: ${massPreference === "daily" ? "Daily Mass" : massPreference === "selected" ? "Mass on selected days" : "No Mass arrangements"}` : "",
          spiritualOpen ? `Priest / Chaplain: ${priestPreference === "yes" ? "Yes" : priestPreference === "no" ? "No" : "To be confirmed"}` : "",
          form.needsFlights ? `International flight departure airport/city: ${departureAirport.trim()}` : "",
          form.notes.trim(),
        ].filter(Boolean).join("\n") || null,
      };

      const response =
        await fetch(
          "/api/b2b/custom-requests",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload,
            ),
          },
        );

      const data =
        (await response.json()) as SubmitResponse;

      if (!response.ok) {
        setError(
          data.error ||
            "Something went wrong while submitting the request.",
        );

        return;
      }

      const requestReference =
        data.requestReference ??
        data.request
          ?.requestReference;

      setSuccessMessage(
        requestReference
          ? `Quote request submitted successfully. Reference: ${requestReference}`
          : "Quote request submitted successfully.",
      );

      const requestId =
        data.id ??
        data.request?.id;

      if (requestId) {
        router.push(
          `/b2b/custom-requests/${requestId}`,
        );

        return;
      }

      router.push(
        "/b2b/custom-requests",
      );
    } catch (submitError) {
      console.error(
        "CUSTOM_REQUEST_FORM_SUBMIT_ERROR",
        submitError,
      );

      setError(
        "Something went wrong while submitting the request.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8B0000]">
          Epoch Journeys
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#001F3F] sm:text-4xl">
          {journey
            ? "Request Official Pilgrimage Quote"
            : "Plan a Private Group Journey"}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {journey
            ? "Tell us about your group, preferred travel dates and requirements. Our team will prepare a tailored NET quotation based on your selected Epoch Journey."
            : "Tell us what your group has in mind. Epoch Journeys will develop a private pilgrimage program and tailored NET quotation for your agency or organization."}
        </p>
      </div>

      {/* Automatically sourced agent identity. Reference and timestamp are assigned on submission. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-[#001F3F]">Quote Request Information</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><p className="text-slate-500">Request No.</p><p className="mt-1 font-semibold text-slate-900">Assigned on submission</p></div>
          <div><p className="text-slate-500">Request Date</p><p className="mt-1 font-semibold text-slate-900">Recorded on submission</p></div>
          <div><p className="text-slate-500">Request Status</p><p className="mt-1 font-semibold text-slate-900">Request Received (after submission)</p></div>
          <div><p className="text-slate-500">Travel Agency</p><p className="mt-1 font-semibold text-slate-900">{agentContext?.agency || "From your agent account"}</p></div>
          <div><p className="text-slate-500">Agent Name</p><p className="mt-1 font-semibold text-slate-900">{agentContext?.name || "From your agent account"}</p></div>
          <div><p className="text-slate-500">Agent Email</p><p className="mt-1 font-semibold text-slate-900">{agentContext?.email || "From your agent account"}</p></div>
        </div>
        <p className="mt-4 text-xs text-slate-500">No need to enter these details. Your unique reference and official submission date will be saved automatically.</p>
      </section>

      {/* JOURNEY LOADING */}

      {journeyLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Loading selected
            journey...
          </p>
        </div>
      ) : null}

      {/* SELECTED JOURNEY */}

      {journey ? (
        <section className="overflow-hidden rounded-2xl border border-[#001F3F]/10 bg-[#001F3F] text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">
              Selected Epoch Journey
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {journey.title}
            </h2>

            {journey.subtitle ? (
              <p className="mt-2 text-sm text-white/70">
                {journey.subtitle}
              </p>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Duration
                </p>

                <p className="mt-1 font-semibold">
                  {journey.duration} Days
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Destinations
                </p>

                <p className="mt-1 font-semibold">
                  {journey.destinations.join(
                    " · ",
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Starting NET
                </p>

                <p className="mt-1 font-semibold">
                  {journey.startingPrice
                    ? `${formatMoney(
                        journey.startingPrice,
                        journey.currency,
                      )} per person`
                    : "On request"}
                </p>

                {journey.startingPrice ? (
                  <p className="mt-1 text-xs text-white/55">
                    Double/Twin
                    occupancy
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Pricing
                </p>

                <p className="mt-1 font-semibold">
                  Private Group
                </p>

                <p className="mt-1 text-xs text-white/55">
                  Final NET quotation
                  tailored to the group
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/5 px-6 py-4 text-xs leading-5 text-white/65 sm:px-8">
            Starting prices are
            indicative NET rates based on
            double/twin occupancy. Final
            pricing depends on travel dates,
            season, group size, rooming,
            hotel availability and requested
            services.
          </div>
        </section>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {!journey ? (
          <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
            <SectionTitle number="1" title="Your Journey" description="A few details are enough to get started." />
            <label className="block"><FieldLabel required>Main Destination</FieldLabel>
              <input name="destination" value={form.destination} onChange={handleChange} required className={inputClass} placeholder="e.g. Italy, Portugal or Greece" />
            </label>
            <label className="block"><FieldLabel>Other Destinations (Optional)</FieldLabel>
              <input name="destinations" value={form.destinations} onChange={handleChange} className={inputClass} placeholder="Additional countries or destinations" />
            </label>
          </section>
        ) : null}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle number={journey ? "1" : "2"} title="Your Group & Travel Dates" description="Approximate information is perfectly fine. No need to confirm dates yet." />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block"><FieldLabel>Preferred Travel Dates / Month</FieldLabel>
                <select value={travelDateMode} onChange={(e) => setTravelDateMode(e.target.value as "dates" | "month" | "undecided")} className={inputClass}>
                  <option value="month">Preferred month</option>
                  <option value="dates">Specific travel dates</option>
                  <option value="undecided">Dates not decided yet</option>
                </select>
              </label>
              {travelDateMode === "month" ? (
                <label className="block"><span className="sr-only">Choose preferred travel month</span>
                  <input type="month" value={travelPeriod} onChange={(e) => setTravelPeriod(e.target.value)} className={inputClass} aria-label="Preferred travel month" />
                </label>
              ) : travelDateMode === "dates" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span className="mb-1 block text-xs text-slate-600">From</span>
                    <input type="date" value={travelStart} max={travelEnd || undefined} onChange={(e) => setTravelStart(e.target.value)} className={inputClass} />
                  </label>
                  <label className="block"><span className="mb-1 block text-xs text-slate-600">To (optional)</span>
                    <input type="date" value={travelEnd} min={travelStart || undefined} onChange={(e) => setTravelEnd(e.target.value)} className={inputClass} />
                  </label>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No problem. We can confirm travel dates later.</p>
              )}
            </div>
            <label className="block"><FieldLabel required>Approximate Total Passengers (including complimentary travelers)</FieldLabel>
              <input type="number" min="1" name="estimatedPax" value={form.estimatedPax} onChange={handleChange} required className={inputClass} placeholder="e.g. 30" />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#001F3F]">Quotation Package Type <span className="text-sm text-red-700">*</span></h2>
          <p className="text-sm text-slate-600">Please tell us whether international airfare should be included in your quotation.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${form.landOnly ? "border-[#001F3F] bg-slate-50" : "border-slate-200"}`}>
              <input type="radio" name="packageType" checked={form.landOnly} onChange={() => setForm(prev => ({ ...prev, landOnly: true, needsFlights: false }))} />
              <span><strong className="block">Land Only</strong><span className="text-sm text-slate-600">International flights not included</span></span>
            </label>
            <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${form.needsFlights ? "border-[#001F3F] bg-slate-50" : "border-slate-200"}`}>
              <input type="radio" name="packageType" checked={form.needsFlights} onChange={() => setForm(prev => ({ ...prev, landOnly: false, needsFlights: true }))} />
              <span><strong className="block">Land + International Flights</strong><span className="text-sm text-slate-600">Please include international airfare</span></span>
            </label>
          </div>
          {form.needsFlights && <label className="block"><span className="mb-2 block text-sm font-medium">Departure airport or city <span className="text-red-700">*</span></span>
            <input className={inputClass} required value={departureAirport} onChange={e => setDepartureAirport(e.target.value)} placeholder="e.g. Newark (EWR) or New York (JFK)" />
          </label>}
          <p className="text-xs text-slate-500">Land Only may still include internal transportation specified in the itinerary.</p>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <button type="button" aria-expanded={spiritualOpen} onClick={() => setSpiritualOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
            <span><span className="block text-lg font-bold text-[#001F3F]">Pilgrimage & Spiritual Requirements <span className="text-sm font-normal text-slate-500">(Optional)</span></span>
              <span className="mt-1 block text-sm text-slate-500">Customize Mass, chaplain, language and shrine preferences if needed.</span></span>
            <span className="shrink-0 text-sm font-semibold text-[#8B0000]">{spiritualOpen ? "Hide −" : "Expand +"}</span>
          </button>
          {spiritualOpen ? <div className="space-y-5 border-t border-slate-100 p-6">
            <label className="block"><FieldLabel>Mass Arrangements</FieldLabel>
              <select value={massPreference} onChange={(e) => setMassPreference(e.target.value)} className={inputClass}>
                <option value="daily">Daily Mass requested</option><option value="selected">Mass on selected days</option><option value="none">No Mass arrangements required</option>
              </select>
            </label>
            <label className="block"><FieldLabel>Priest / Chaplain Traveling</FieldLabel>
              <select value={priestPreference} onChange={(e) => setPriestPreference(e.target.value)} className={inputClass}>
                <option value="unknown">To be confirmed</option><option value="yes">Yes</option><option value="no">No</option>
              </select>
            </label>
            <label className="block"><FieldLabel>Guide Language</FieldLabel>
              <select name="guideLanguage" value={form.guideLanguage} onChange={handleChange} className={inputClass}>
                {["English", "Spanish", "Portuguese", "Italian", "French", "German", "Other (specify below)"].map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </label>
            <label className="block"><FieldLabel>Special Churches / Shrines</FieldLabel>
              <textarea rows={3} name="specialChurchRequests" value={form.specialChurchRequests} onChange={handleChange} className={inputClass} placeholder="Optional" />
            </label>
          </div> : null}
        </section>

        <section className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle number={journey ? "2" : "3"} title="Special / Additional Requests" description="Optional — leave blank if there is nothing else to add." />
          <textarea rows={4} name="specialRequests" value={form.specialRequests} onChange={handleChange} className={inputClass} aria-label="Special or additional requests" />
        </section>

        {/* SUBMIT */}

        <section className="rounded-2xl border border-[#001F3F]/10 bg-slate-50 p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h2 className="font-bold text-[#001F3F]">
                Ready for Epoch
                Journeys to prepare
                your quotation?
              </h2>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                Submission does not
                confirm services or
                availability. Our team
                will review your
                requirements and
                prepare an official
                NET quotation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/b2b/custom-requests",
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#001F3F]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading ||
                  journeyLoading
                }
                className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Submitting..."
                  : "Request Official Quote"}
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}