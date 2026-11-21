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

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10";

  const checkboxClass =
    "h-4 w-4 rounded border-slate-300 accent-[#8B0000]";

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
          form.startDate ||
          null,

        alternativeStartDate:
          form.alternativeStartDate ||
          null,

        endDate:
          form.endDate ||
          null,

        datesFlexible:
          form.datesFlexible,

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

        priestTraveling:
          form.priestTraveling,

        dailyMassRequested:
          form.dailyMassRequested,

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

        notes:
          form.notes.trim() ||
          null,
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

        {/* 1 JOURNEY */}

        {!journey ? (
          <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
            <SectionTitle
              number="1"
              title="Journey Request"
              description="Give us the basic idea for the private pilgrimage you would like us to prepare."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <FieldLabel>
                  Request Type
                </FieldLabel>

                <select
                  name="requestType"
                  value={
                    form.requestType
                  }
                  onChange={
                    handleChange
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="TAILOR_MADE">
                    Tailor-Made
                    Pilgrimage
                  </option>

                  <option value="BESPOKE_GROUP">
                    Bespoke Group
                  </option>
                </select>
              </label>

              <label>
                <FieldLabel>
                  Working Title
                </FieldLabel>

                <input
                  name="title"
                  value={form.title}
                  onChange={
                    handleChange
                  }
                  placeholder="Example: St. Paul Pilgrimage in Greece"
                  className={
                    inputClass
                  }
                />
              </label>

              <label>
                <FieldLabel
                  required
                >
                  Main Destination
                </FieldLabel>

                <input
                  name="destination"
                  value={
                    form.destination
                  }
                  onChange={
                    handleChange
                  }
                  required
                  placeholder="Example: Greece"
                  className={
                    inputClass
                  }
                />
              </label>

              <label>
                <FieldLabel>
                  Countries /
                  Destinations
                </FieldLabel>

                <input
                  name="destinations"
                  value={
                    form.destinations
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Greece, Turkey"
                  className={
                    inputClass
                  }
                />
              </label>
            </div>
          </section>
        ) : null}

        {/* TRAVEL DATES */}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle
            number={
              journey ? "1" : "2"
            }
            title="Travel Dates"
            description="Approximate dates are sufficient. Flexible dates can often provide better hotel availability and pricing."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <label>
              <FieldLabel>
                Preferred Start
              </FieldLabel>

              <input
                type="date"
                name="startDate"
                value={
                  form.startDate
                }
                onChange={
                  handleChange
                }
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Alternative Start
              </FieldLabel>

              <input
                type="date"
                name="alternativeStartDate"
                value={
                  form.alternativeStartDate
                }
                onChange={
                  handleChange
                }
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Preferred End
              </FieldLabel>

              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={
                  handleChange
                }
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Duration
              </FieldLabel>

              <input
                type="number"
                min="1"
                name="durationDays"
                value={
                  form.durationDays
                }
                onChange={
                  handleChange
                }
                readOnly={
                  Boolean(journey)
                }
                className={`${inputClass} ${
                  journey
                    ? "bg-slate-50 text-slate-500"
                    : ""
                }`}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              name="datesFlexible"
              checked={
                form.datesFlexible
              }
              onChange={
                handleChange
              }
              className={
                checkboxClass
              }
            />

            Our dates are flexible.
          </label>
        </section>

        {/* GROUP */}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle
            number={
              journey ? "2" : "3"
            }
            title="Your Group"
            description="Group size is one of the most important factors in preparing an accurate NET quotation."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <label>
              <FieldLabel
                required
              >
                Estimated Pilgrims
              </FieldLabel>

              <input
                type="number"
                min="1"
                name="estimatedPax"
                value={
                  form.estimatedPax
                }
                onChange={
                  handleChange
                }
                required
                placeholder="30"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Adults
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="adults"
                value={form.adults}
                onChange={
                  handleChange
                }
                placeholder="30"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Children
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="children"
                value={
                  form.children
                }
                onChange={
                  handleChange
                }
                placeholder="0"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Infants
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="infants"
                value={
                  form.infants
                }
                onChange={
                  handleChange
                }
                placeholder="0"
                className={
                  inputClass
                }
              />
            </label>

            <label className="lg:col-span-2">
              <FieldLabel>
                Group / Parish /
                Organization
              </FieldLabel>

              <input
                name="groupName"
                value={
                  form.groupName
                }
                onChange={
                  handleChange
                }
                placeholder="Example: St. Joseph Parish"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Group Leader
              </FieldLabel>

              <input
                name="groupLeaderName"
                value={
                  form.groupLeaderName
                }
                onChange={
                  handleChange
                }
                placeholder="Name"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Complimentary Places
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="complimentaryPlaces"
                value={
                  form.complimentaryPlaces
                }
                onChange={
                  handleChange
                }
                placeholder="1"
                className={
                  inputClass
                }
              />
            </label>
          </div>
        </section>

        {/* ROOMING */}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle
            number={
              journey ? "3" : "4"
            }
            title="Room Requirements"
            description="An estimate is enough at quotation stage. The final rooming list can be supplied later."
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <FieldLabel>
                Twin Rooms
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="twinRooms"
                value={
                  form.twinRooms
                }
                onChange={
                  handleChange
                }
                placeholder="12"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Double Rooms
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="doubleRooms"
                value={
                  form.doubleRooms
                }
                onChange={
                  handleChange
                }
                placeholder="2"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Single Rooms
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="singleRooms"
                value={
                  form.singleRooms
                }
                onChange={
                  handleChange
                }
                placeholder="2"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Triple Rooms
              </FieldLabel>

              <input
                type="number"
                min="0"
                name="tripleRooms"
                value={
                  form.tripleRooms
                }
                onChange={
                  handleChange
                }
                placeholder="0"
                className={
                  inputClass
                }
              />
            </label>
          </div>
        </section>

        {/* PILGRIMAGE */}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle
            number={
              journey ? "4" : "5"
            }
            title="Pilgrimage & Spiritual Requirements"
            description="These details help us build the spiritual rhythm of the journey, not simply its sightseeing program."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                name="dailyMassRequested"
                checked={
                  form.dailyMassRequested
                }
                onChange={
                  handleChange
                }
                className={`mt-0.5 ${checkboxClass}`}
              />

              <div>
                <p className="text-sm font-semibold text-[#001F3F]">
                  Daily Mass
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Request Mass
                  arrangements where
                  operationally possible.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                name="priestTraveling"
                checked={
                  form.priestTraveling
                }
                onChange={
                  handleChange
                }
                className={`mt-0.5 ${checkboxClass}`}
              />

              <div>
                <p className="text-sm font-semibold text-[#001F3F]">
                  Priest / Chaplain
                  Traveling
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  A priest or chaplain
                  will accompany the
                  group.
                </p>
              </div>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <FieldLabel>
                Guide Language
              </FieldLabel>

              <input
                name="guideLanguage"
                value={
                  form.guideLanguage
                }
                onChange={
                  handleChange
                }
                placeholder="English"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Special Churches /
                Shrines
              </FieldLabel>

              <textarea
                rows={3}
                name="specialChurchRequests"
                value={
                  form.specialChurchRequests
                }
                onChange={
                  handleChange
                }
                placeholder="Any church, shrine, saint, devotion or special Mass location important to the group..."
                className={
                  inputClass
                }
              />
            </label>
          </div>
        </section>

        {/* SERVICES */}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle
            number={
              journey ? "5" : "6"
            }
            title="Hotels, Flights & Additional Services"
            description="Tell us how you would like the journey positioned. These preferences can be adjusted during quotation."
          />

          <div className="grid gap-5 md:grid-cols-3">
            <label>
              <FieldLabel>
                Hotel Standard
              </FieldLabel>

              <select
                name="accommodationLevel"
                value={
                  form.accommodationLevel
                }
                onChange={
                  handleChange
                }
                className={
                  inputClass
                }
              >
                <option value="">
                  Select
                </option>

                <option value="STANDARD_3_STAR">
                  Standard 3-Star
                </option>

                <option value="COMFORT_4_STAR">
                  Comfort 4-Star
                </option>

                <option value="PREMIUM_5_STAR">
                  Premium 5-Star
                </option>

                <option value="MIXED">
                  Best Appropriate
                  Mix
                </option>
              </select>
            </label>

            <label>
              <FieldLabel>
                Target Budget /
                Person
              </FieldLabel>

              <input
                type="number"
                min="0"
                step="0.01"
                name="budgetPerPerson"
                value={
                  form.budgetPerPerson
                }
                onChange={
                  handleChange
                }
                placeholder="Optional"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Currency
              </FieldLabel>

              <select
                name="currency"
                value={
                  form.currency
                }
                onChange={
                  handleChange
                }
                className={
                  inputClass
                }
              >
                <option value="EUR">
                  EUR
                </option>

                <option value="USD">
                  USD
                </option>

                <option value="GBP">
                  GBP
                </option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="landOnly"
                checked={
                  form.landOnly
                }
                onChange={
                  handleChange
                }
                className={
                  checkboxClass
                }
              />

              Land arrangements
              only
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="needsFlights"
                checked={
                  form.needsFlights
                }
                onChange={
                  handleChange
                }
                className={
                  checkboxClass
                }
              />

              Please quote flights
              where possible
            </label>
          </div>

          <label>
            <FieldLabel>
              Extension / Additional
              Program
            </FieldLabel>

            <textarea
              rows={3}
              name="extensionRequest"
              value={
                form.extensionRequest
              }
              onChange={
                handleChange
              }
              placeholder="Example: Add 2 nights in Rome, Assisi extension, additional leisure day..."
              className={
                inputClass
              }
            />
          </label>
        </section>

        {/* CONTACT */}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle
            number={
              journey ? "6" : "7"
            }
            title="Group Contact"
            description="Use this section for the parish, organization or principal group contact when applicable."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <FieldLabel>
                Organization /
                Company
              </FieldLabel>

              <input
                name="companyName"
                value={
                  form.companyName
                }
                onChange={
                  handleChange
                }
                placeholder="Parish, church, organization or company"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Contact Name
              </FieldLabel>

              <input
                name="customerName"
                value={
                  form.customerName
                }
                onChange={
                  handleChange
                }
                placeholder="Full name"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Contact Email
              </FieldLabel>

              <input
                type="email"
                name="customerEmail"
                value={
                  form.customerEmail
                }
                onChange={
                  handleChange
                }
                placeholder="email@example.com"
                className={
                  inputClass
                }
              />
            </label>

            <label>
              <FieldLabel>
                Contact Phone
              </FieldLabel>

              <input
                name="customerPhone"
                value={
                  form.customerPhone
                }
                onChange={
                  handleChange
                }
                placeholder="+1 ..."
                className={
                  inputClass
                }
              />
            </label>
          </div>
        </section>

        {/* NOTES */}

        <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
          <SectionTitle
            number={
              journey ? "7" : "8"
            }
            title="Final Requirements"
            description="Tell us anything that could help us prepare a more accurate and thoughtful proposal."
          />

          <label>
            <FieldLabel>
              Special Requirements
            </FieldLabel>

            <textarea
              rows={4}
              name="specialRequests"
              value={
                form.specialRequests
              }
              onChange={
                handleChange
              }
              placeholder="Mobility considerations, dietary requirements, special celebrations, preferred hotels, transportation requirements..."
              className={
                inputClass
              }
            />
          </label>

          <label>
            <FieldLabel>
              Additional Notes
            </FieldLabel>

            <textarea
              rows={5}
              name="notes"
              value={form.notes}
              onChange={
                handleChange
              }
              placeholder="Anything else our pilgrimage planning team should know..."
              className={
                inputClass
              }
            />
          </label>
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