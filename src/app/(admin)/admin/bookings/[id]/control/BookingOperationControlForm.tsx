"use client";

import {
  useMemo,
  useState,
} from "react";

type OperationItem = {
  id: string;
  name: string;
  location: string;
  date: string;
  contactName: string;
  contactInfo: string;
  notes: string;
  confirmed: boolean;
};

type ContactInfo = {
  name: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
};

type GroupInfo = {
  groupName: string;
  groupCode: string;
  numberOfPilgrims: string;
  startDate: string;
  endDate: string;
  tourCoordinatorName: string;
  tourCoordinatorPhone: string;
  notes: string;
};

type HeadsetInfo = {
  provider: string;
  quantity: string;
  pickupDetails: string;
  dropoffDetails: string;
  contactName: string;
  contactInfo: string;
  notes: string;
};

type DailyItineraryItem = {
  id: string;
  dayNumber: string;
  date: string;
  title: string;
  departureTime: string;
  program: string;
  mass: string;
  lunch: string;
  dinner: string;
  hotel: string;
  notes: string;
};

type PaymentResponsibility = {
  id: string;
  item: string;
  responsiblePerson: string;
  amount: string;
  currency: string;
  notes: string;
  confirmed: boolean;
};

type InitialData = {
  hotelItems: unknown;
  transportItems: unknown;
  guideItems: unknown;
  restaurantItems: unknown;
  massItems: unknown;
  ticketItems: unknown;
  paymentItems: unknown;
  documentItems: unknown;
  emergencyItems: unknown;

  groupInfo: unknown;
  tourManagerInfo: unknown;
  spiritualDirectorInfo: unknown;
  groupLeaderInfo: unknown;
  flightItems: unknown;
  trainItems: unknown;
  headsetInfo: unknown;
  dailyItinerary: unknown;
  paymentResponsibilities: unknown;

  lunchInstructions: string | null;
  drivingInstructions: string | null;
  generalInstructions: string | null;
  folderNotes: string | null;
  finalNotes: string | null;
} | null;

type Props = {
  bookingId: string;
  initialData: InitialData;
};

type SectionKey =
  | "hotelItems"
  | "transportItems"
  | "guideItems"
  | "restaurantItems"
  | "massItems"
  | "ticketItems"
  | "paymentItems"
  | "documentItems"
  | "emergencyItems"
  | "flightItems"
  | "trainItems";

type FormState = Record<
  SectionKey,
  OperationItem[]
> & {
  groupInfo: GroupInfo;
  tourManagerInfo: ContactInfo;
  spiritualDirectorInfo: ContactInfo;
  groupLeaderInfo: ContactInfo;
  headsetInfo: HeadsetInfo;
  dailyItinerary: DailyItineraryItem[];
  paymentResponsibilities: PaymentResponsibility[];
  lunchInstructions: string;
  drivingInstructions: string;
  generalInstructions: string;
  folderNotes: string;
  finalNotes: string;
};

const coreSectionLabels: {
  key: SectionKey;
  title: string;
}[] = [
  {
    key: "hotelItems",
    title: "Hotels",
  },
  {
    key: "transportItems",
    title: "Transportation / Coach",
  },
  {
    key: "guideItems",
    title: "Guides / Tour Managers",
  },
  {
    key: "restaurantItems",
    title: "Restaurants / Meals",
  },
  {
    key: "massItems",
    title: "Churches / Mass Arrangements",
  },
  {
    key: "ticketItems",
    title: "Tickets / Visits",
  },
  {
    key: "paymentItems",
    title: "Supplier Payments",
  },
  {
    key: "documentItems",
    title: "Documents",
  },
  {
    key: "emergencyItems",
    title: "Emergency Contacts",
  },
];

const travelSectionLabels: {
  key: SectionKey;
  title: string;
}[] = [
  {
    key: "flightItems",
    title: "Flights",
  },
  {
    key: "trainItems",
    title: "Trains",
  },
];

function createEmptyItem(): OperationItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    location: "",
    date: "",
    contactName: "",
    contactInfo: "",
    notes: "",
    confirmed: false,
  };
}

function createEmptyDailyItem(): DailyItineraryItem {
  return {
    id: crypto.randomUUID(),
    dayNumber: "",
    date: "",
    title: "",
    departureTime: "",
    program: "",
    mass: "",
    lunch: "",
    dinner: "",
    hotel: "",
    notes: "",
  };
}

function createEmptyPaymentResponsibility(): PaymentResponsibility {
  return {
    id: crypto.randomUUID(),
    item: "",
    responsiblePerson: "",
    amount: "",
    currency: "EUR",
    notes: "",
    confirmed: false,
  };
}

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function stringValue(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value
    : "";
}

function booleanValue(
  value: unknown,
) {
  return Boolean(value);
}

function parseItems(
  value: unknown,
): OperationItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isObject)
    .map((item) => ({
      id:
        stringValue(
          item.id,
        ) ||
        crypto.randomUUID(),

      name:
        stringValue(
          item.name,
        ),

      location:
        stringValue(
          item.location,
        ),

      date:
        stringValue(
          item.date,
        ),

      contactName:
        stringValue(
          item.contactName,
        ),

      contactInfo:
        stringValue(
          item.contactInfo,
        ),

      notes:
        stringValue(
          item.notes,
        ),

      confirmed:
        booleanValue(
          item.confirmed,
        ),
    }));
}

function parseContactInfo(
  value: unknown,
): ContactInfo {
  if (!isObject(value)) {
    return {
      name: "",
      phone: "",
      email: "",
      company: "",
      notes: "",
    };
  }

  return {
    name:
      stringValue(
        value.name,
      ),

    phone:
      stringValue(
        value.phone,
      ),

    email:
      stringValue(
        value.email,
      ),

    company:
      stringValue(
        value.company,
      ),

    notes:
      stringValue(
        value.notes,
      ),
  };
}

function parseGroupInfo(
  value: unknown,
): GroupInfo {
  if (!isObject(value)) {
    return {
      groupName: "",
      groupCode: "",
      numberOfPilgrims: "",
      startDate: "",
      endDate: "",
      tourCoordinatorName: "",
      tourCoordinatorPhone: "",
      notes: "",
    };
  }

  return {
    groupName:
      stringValue(
        value.groupName,
      ),

    groupCode:
      stringValue(
        value.groupCode,
      ),

    numberOfPilgrims:
      stringValue(
        value.numberOfPilgrims,
      ),

    startDate:
      stringValue(
        value.startDate,
      ),

    endDate:
      stringValue(
        value.endDate,
      ),

    tourCoordinatorName:
      stringValue(
        value.tourCoordinatorName,
      ),

    tourCoordinatorPhone:
      stringValue(
        value.tourCoordinatorPhone,
      ),

    notes:
      stringValue(
        value.notes,
      ),
  };
}

function parseHeadsetInfo(
  value: unknown,
): HeadsetInfo {
  if (!isObject(value)) {
    return {
      provider: "",
      quantity: "",
      pickupDetails: "",
      dropoffDetails: "",
      contactName: "",
      contactInfo: "",
      notes: "",
    };
  }

  return {
    provider:
      stringValue(
        value.provider,
      ),

    quantity:
      stringValue(
        value.quantity,
      ),

    pickupDetails:
      stringValue(
        value.pickupDetails,
      ),

    dropoffDetails:
      stringValue(
        value.dropoffDetails,
      ),

    contactName:
      stringValue(
        value.contactName,
      ),

    contactInfo:
      stringValue(
        value.contactInfo,
      ),

    notes:
      stringValue(
        value.notes,
      ),
  };
}

function parseDailyItinerary(
  value: unknown,
): DailyItineraryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isObject)
    .map((item) => ({
      id:
        stringValue(
          item.id,
        ) ||
        crypto.randomUUID(),

      dayNumber:
        stringValue(
          item.dayNumber,
        ),

      date:
        stringValue(
          item.date,
        ),

      title:
        stringValue(
          item.title,
        ),

      departureTime:
        stringValue(
          item.departureTime,
        ),

      program:
        stringValue(
          item.program,
        ),

      mass:
        stringValue(
          item.mass,
        ),

      lunch:
        stringValue(
          item.lunch,
        ),

      dinner:
        stringValue(
          item.dinner,
        ),

      hotel:
        stringValue(
          item.hotel,
        ),

      notes:
        stringValue(
          item.notes,
        ),
    }));
}

function parsePaymentResponsibilities(
  value: unknown,
): PaymentResponsibility[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isObject)
    .map((item) => ({
      id:
        stringValue(
          item.id,
        ) ||
        crypto.randomUUID(),

      item:
        stringValue(
          item.item,
        ),

      responsiblePerson:
        stringValue(
          item.responsiblePerson,
        ),

      amount:
        stringValue(
          item.amount,
        ),

      currency:
        stringValue(
          item.currency,
        ) ||
        "EUR",

      notes:
        stringValue(
          item.notes,
        ),

      confirmed:
        booleanValue(
          item.confirmed,
        ),
    }));
}

function getStatusBadge(
  completed: number,
  total: number,
) {
  if (
    total === 0 ||
    completed === 0
  ) {
    return {
      label:
        "PENDING",

      className:
        "bg-red-100 text-red-800",
    };
  }

  if (
    completed ===
    total
  ) {
    return {
      label:
        "READY",

      className:
        "bg-green-100 text-green-800",
    };
  }

  return {
    label:
      "IN PROGRESS",

    className:
      "bg-yellow-100 text-yellow-800",
  };
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100";

const textareaClass =
  "min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100";

const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function BookingOperationControlForm({
  bookingId,
  initialData,
}: Props) {
  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState<FormState>({
      hotelItems:
        parseItems(
          initialData?.hotelItems,
        ),

      transportItems:
        parseItems(
          initialData?.transportItems,
        ),

      guideItems:
        parseItems(
          initialData?.guideItems,
        ),

      restaurantItems:
        parseItems(
          initialData?.restaurantItems,
        ),

      massItems:
        parseItems(
          initialData?.massItems,
        ),

      ticketItems:
        parseItems(
          initialData?.ticketItems,
        ),

      paymentItems:
        parseItems(
          initialData?.paymentItems,
        ),

      documentItems:
        parseItems(
          initialData?.documentItems,
        ),

      emergencyItems:
        parseItems(
          initialData?.emergencyItems,
        ),

      flightItems:
        parseItems(
          initialData?.flightItems,
        ),

      trainItems:
        parseItems(
          initialData?.trainItems,
        ),

      groupInfo:
        parseGroupInfo(
          initialData?.groupInfo,
        ),

      tourManagerInfo:
        parseContactInfo(
          initialData?.tourManagerInfo,
        ),

      spiritualDirectorInfo:
        parseContactInfo(
          initialData?.spiritualDirectorInfo,
        ),

      groupLeaderInfo:
        parseContactInfo(
          initialData?.groupLeaderInfo,
        ),

      headsetInfo:
        parseHeadsetInfo(
          initialData?.headsetInfo,
        ),

      dailyItinerary:
        parseDailyItinerary(
          initialData?.dailyItinerary,
        ),

      paymentResponsibilities:
        parsePaymentResponsibilities(
          initialData?.paymentResponsibilities,
        ),

      lunchInstructions:
        initialData
          ?.lunchInstructions ??
        "",

      drivingInstructions:
        initialData
          ?.drivingInstructions ??
        "",

      generalInstructions:
        initialData
          ?.generalInstructions ??
        "",

      folderNotes:
        initialData
          ?.folderNotes ??
        "",

      finalNotes:
        initialData
          ?.finalNotes ??
        "",
    });

  const summary =
    useMemo(() => {
      const itemSections = [
        ...coreSectionLabels,
        ...travelSectionLabels,
      ];

      const allItems =
        itemSections.flatMap(
          (
            section,
          ) =>
            form[
              section.key
            ],
        );

      const total =
        allItems.length;

      const completed =
        allItems.filter(
          (
            item,
          ) =>
            item.confirmed,
        ).length;

      const percentage =
        total === 0
          ? 0
          : Math.round(
              (
                completed /
                total
              ) *
                100,
            );

      const missingItems =
        allItems
          .filter(
            (
              item,
            ) =>
              !item.confirmed &&
              item.name.trim(),
          )
          .map(
            (
              item,
            ) =>
              item.name.trim(),
          );

      return {
        total,
        completed,
        percentage,
        missingItems,

        badge:
          getStatusBadge(
            completed,
            total,
          ),
      };
    }, [
      form,
    ]);

  function addRow(
    section: SectionKey,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        [section]: [
          ...previous[
            section
          ],

          createEmptyItem(),
        ],
      }),
    );
  }

  function updateItem(
    section: SectionKey,
    id: string,
    field:
      keyof OperationItem,
    value:
      | string
      | boolean,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        [section]:
          previous[
            section
          ].map(
            (
              item,
            ) =>
              item.id ===
              id
                ? {
                    ...item,

                    [field]:
                      value,
                  }
                : item,
          ),
      }),
    );
  }

  function removeRow(
    section: SectionKey,
    id: string,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        [section]:
          previous[
            section
          ].filter(
            (
              item,
            ) =>
              item.id !==
              id,
          ),
      }),
    );
  }

  function updateGroupInfo(
    field:
      keyof GroupInfo,
    value: string,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        groupInfo: {
          ...previous.groupInfo,

          [field]:
            value,
        },
      }),
    );
  }

  function updateContact(
    field:
      | "tourManagerInfo"
      | "spiritualDirectorInfo"
      | "groupLeaderInfo",

    key:
      keyof ContactInfo,

    value:
      string,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        [field]: {
          ...previous[
            field
          ],

          [key]:
            value,
        },
      }),
    );
  }

  function updateHeadset(
    field:
      keyof HeadsetInfo,
    value: string,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        headsetInfo: {
          ...previous.headsetInfo,

          [field]:
            value,
        },
      }),
    );
  }

  function addDailyItineraryItem() {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        dailyItinerary: [
          ...previous.dailyItinerary,

          createEmptyDailyItem(),
        ],
      }),
    );
  }

  function updateDailyItineraryItem(
    id: string,
    field:
      keyof DailyItineraryItem,
    value: string,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        dailyItinerary:
          previous.dailyItinerary.map(
            (
              item,
            ) =>
              item.id ===
              id
                ? {
                    ...item,

                    [field]:
                      value,
                  }
                : item,
          ),
      }),
    );
  }

  function removeDailyItineraryItem(
    id: string,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        dailyItinerary:
          previous.dailyItinerary.filter(
            (
              item,
            ) =>
              item.id !==
              id,
          ),
      }),
    );
  }

  function addPaymentResponsibility() {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        paymentResponsibilities:
          [
            ...previous.paymentResponsibilities,

            createEmptyPaymentResponsibility(),
          ],
      }),
    );
  }

  function updatePaymentResponsibility(
    id: string,
    field:
      keyof PaymentResponsibility,
    value:
      | string
      | boolean,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        paymentResponsibilities:
          previous.paymentResponsibilities.map(
            (
              item,
            ) =>
              item.id ===
              id
                ? {
                    ...item,

                    [field]:
                      value,
                  }
                : item,
          ),
      }),
    );
  }

  function removePaymentResponsibility(
    id: string,
  ) {
    setForm(
      (
        previous,
      ) => ({
        ...previous,

        paymentResponsibilities:
          previous.paymentResponsibilities.filter(
            (
              item,
            ) =>
              item.id !==
              id,
          ),
      }),
    );
  }

  async function handleSubmit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/admin/bookings/${bookingId}/control`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const data =
        await response.json().catch(
          () =>
            null,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ||
            "Unable to save operations.",
        );
      }

      setMessage(
        "Operations and Tour Management information saved.",
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Unable to save operations.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  function renderOperationSection(
    section: {
      key: SectionKey;
      title: string;
    },
  ) {
    return (
      <div
        key={
          section.key
        }
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {
              section.title
            }
          </h3>

          <button
            type="button"
            onClick={() =>
              addRow(
                section.key,
              )
            }
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {form[
            section.key
          ].length ===
            0 && (
            <p className="text-sm text-slate-500">
              No items
              added yet.
            </p>
          )}

          {form[
            section.key
          ].map(
            (
              item,
            ) => (
              <div
                key={
                  item.id
                }
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label
                      className={
                        labelClass
                      }
                    >
                      Name /
                      Service
                    </label>

                    <input
                      className={
                        inputClass
                      }
                      value={
                        item.name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          section.key,
                          item.id,
                          "name",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label
                      className={
                        labelClass
                      }
                    >
                      Location
                    </label>

                    <input
                      className={
                        inputClass
                      }
                      value={
                        item.location
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          section.key,
                          item.id,
                          "location",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label
                      className={
                        labelClass
                      }
                    >
                      Date /
                      Time
                    </label>

                    <input
                      className={
                        inputClass
                      }
                      value={
                        item.date
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          section.key,
                          item.id,
                          "date",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label
                      className={
                        labelClass
                      }
                    >
                      Contact
                      Name
                    </label>

                    <input
                      className={
                        inputClass
                      }
                      value={
                        item.contactName
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          section.key,
                          item.id,
                          "contactName",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label
                      className={
                        labelClass
                      }
                    >
                      Contact
                      Info
                    </label>

                    <input
                      className={
                        inputClass
                      }
                      value={
                        item.contactInfo
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          section.key,
                          item.id,
                          "contactInfo",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={
                          item.confirmed
                        }
                        disabled={
                          !item.name.trim()
                        }
                        onChange={(
                          event,
                        ) =>
                          updateItem(
                            section.key,
                            item.id,
                            "confirmed",
                            event
                              .target
                              .checked,
                          )
                        }
                      />

                      Confirmed
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    className={
                      labelClass
                    }
                  >
                    Notes
                  </label>

                  <textarea
                    className={
                      textareaClass
                    }
                    value={
                      item.notes
                    }
                    onChange={(
                      event,
                    ) =>
                      updateItem(
                        section.key,
                        item.id,
                        "notes",
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      removeRow(
                        section.key,
                        item.id,
                      )
                    }
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  function renderContactCard(
    title: string,

    field:
      | "tourManagerInfo"
      | "spiritualDirectorInfo"
      | "groupLeaderInfo",
  ) {
    const value =
      form[
        field
      ];

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          {title}
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label
              className={
                labelClass
              }
            >
              Name
            </label>

            <input
              className={
                inputClass
              }
              value={
                value.name
              }
              onChange={(
                event,
              ) =>
                updateContact(
                  field,
                  "name",
                  event
                    .target
                    .value,
                )
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Company /
              Organization
            </label>

            <input
              className={
                inputClass
              }
              value={
                value.company
              }
              onChange={(
                event,
              ) =>
                updateContact(
                  field,
                  "company",
                  event
                    .target
                    .value,
                )
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Phone
            </label>

            <input
              className={
                inputClass
              }
              value={
                value.phone
              }
              onChange={(
                event,
              ) =>
                updateContact(
                  field,
                  "phone",
                  event
                    .target
                    .value,
                )
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Email
            </label>

            <input
              className={
                inputClass
              }
              value={
                value.email
              }
              onChange={(
                event,
              ) =>
                updateContact(
                  field,
                  "email",
                  event
                    .target
                    .value,
                )
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <label
            className={
              labelClass
            }
          >
            Notes
          </label>

          <textarea
            className={
              textareaClass
            }
            value={
              value.notes
            }
            onChange={(
              event,
            ) =>
              updateContact(
                field,
                "notes",
                event
                  .target
                  .value,
              )
            }
          />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-8"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Operations
              Control
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {
                summary.completed
              }{" "}
              /{" "}
              {
                summary.total
              }{" "}
              confirmed (
              {
                summary.percentage
              }
              %)
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${summary.badge.className}`}
          >
            {
              summary
                .badge
                .label
            }
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-all"
            style={{
              width:
                `${summary.percentage}%`,
            }}
          />
        </div>

        {summary
          .missingItems
          .length >
          0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-red-700">
              Not yet
              confirmed:
            </p>

            <ul className="mt-1 list-disc pl-5 text-sm text-red-600">
              {summary.missingItems.map(
                (
                  item,
                  index,
                ) => (
                  <li
                    key={`${item}-${index}`}
                  >
                    {
                      item
                    }
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Core
          Operations
        </h2>

        <div className="space-y-5">
          {coreSectionLabels.map(
            (
              section,
            ) =>
              renderOperationSection(
                section,
              ),
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-8">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-slate-900">
            Tour
            Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Operational
            information used
            to prepare the Tour
            Manager / Guide
            Folder.
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Group
              Information
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                [
                  "groupName",
                  "Group Name",
                ],
                [
                  "groupCode",
                  "Group Code / Reference",
                ],
                [
                  "numberOfPilgrims",
                  "Number of Pilgrims",
                ],
                [
                  "startDate",
                  "Start Date",
                ],
                [
                  "endDate",
                  "End Date",
                ],
                [
                  "tourCoordinatorName",
                  "Tour Coordinator",
                ],
                [
                  "tourCoordinatorPhone",
                  "Coordinator Phone",
                ],
              ].map(
                ([
                  key,
                  label,
                ]) => (
                  <div
                    key={
                      key
                    }
                  >
                    <label
                      className={
                        labelClass
                      }
                    >
                      {
                        label
                      }
                    </label>

                    <input
                      className={
                        inputClass
                      }
                      value={
                        form
                          .groupInfo[
                          key as keyof GroupInfo
                        ]
                      }
                      onChange={(
                        event,
                      ) =>
                        updateGroupInfo(
                          key as keyof GroupInfo,
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>
                ),
              )}
            </div>

            <div className="mt-4">
              <label
                className={
                  labelClass
                }
              >
                Group
                Notes
              </label>

              <textarea
                className={
                  textareaClass
                }
                value={
                  form
                    .groupInfo
                    .notes
                }
                onChange={(
                  event,
                ) =>
                  updateGroupInfo(
                    "notes",
                    event
                      .target
                      .value,
                  )
                }
              />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {renderContactCard(
              "Tour Manager",
              "tourManagerInfo",
            )}

            {renderContactCard(
              "Spiritual Director / Priest",
              "spiritualDirectorInfo",
            )}

            {renderContactCard(
              "Group Leader",
              "groupLeaderInfo",
            )}
          </div>

          {travelSectionLabels.map(
            (
              section,
            ) =>
              renderOperationSection(
                section,
              ),
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Headsets /
              Whisper Sets
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                [
                  "provider",
                  "Provider",
                ],
                [
                  "quantity",
                  "Quantity",
                ],
                [
                  "contactName",
                  "Contact Name",
                ],
                [
                  "contactInfo",
                  "Contact Info",
                ],
                [
                  "pickupDetails",
                  "Pickup Details",
                ],
                [
                  "dropoffDetails",
                  "Drop-off Details",
                ],
              ].map(
                ([
                  key,
                  label,
                ]) => (
                  <div
                    key={
                      key
                    }
                  >
                    <label
                      className={
                        labelClass
                      }
                    >
                      {
                        label
                      }
                    </label>

                    <input
                      className={
                        inputClass
                      }
                      value={
                        form
                          .headsetInfo[
                          key as keyof HeadsetInfo
                        ]
                      }
                      onChange={(
                        event,
                      ) =>
                        updateHeadset(
                          key as keyof HeadsetInfo,
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>
                ),
              )}
            </div>

            <div className="mt-4">
              <label
                className={
                  labelClass
                }
              >
                Notes
              </label>

              <textarea
                className={
                  textareaClass
                }
                value={
                  form
                    .headsetInfo
                    .notes
                }
                onChange={(
                  event,
                ) =>
                  updateHeadset(
                    "notes",
                    event
                      .target
                      .value,
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Daily
                Itinerary
              </h3>

              <button
                type="button"
                onClick={
                  addDailyItineraryItem
                }
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Add Day
              </button>
            </div>

            <div className="mt-4 space-y-5">
              {form.dailyItinerary.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label
                          className={
                            labelClass
                          }
                        >
                          Day
                        </label>

                        <input
                          className={
                            inputClass
                          }
                          value={
                            item.dayNumber
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDailyItineraryItem(
                              item.id,
                              "dayNumber",
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className={
                            labelClass
                          }
                        >
                          Date
                        </label>

                        <input
                          className={
                            inputClass
                          }
                          value={
                            item.date
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDailyItineraryItem(
                              item.id,
                              "date",
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className={
                            labelClass
                          }
                        >
                          Title
                        </label>

                        <input
                          className={
                            inputClass
                          }
                          value={
                            item.title
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDailyItineraryItem(
                              item.id,
                              "title",
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      </div>

                      <div>
                        <label
                          className={
                            labelClass
                          }
                        >
                          Departure
                          Time
                        </label>

                        <input
                          className={
                            inputClass
                          }
                          value={
                            item.departureTime
                          }
                          onChange={(
                            event,
                          ) =>
                            updateDailyItineraryItem(
                              item.id,
                              "departureTime",
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      </div>
                    </div>

                    {[
                      [
                        "program",
                        "Program",
                      ],
                      [
                        "mass",
                        "Mass",
                      ],
                      [
                        "lunch",
                        "Lunch",
                      ],
                      [
                        "dinner",
                        "Dinner",
                      ],
                      [
                        "hotel",
                        "Hotel",
                      ],
                      [
                        "notes",
                        "Operational Notes",
                      ],
                    ].map(
                      ([
                        key,
                        label,
                      ]) => (
                        <div
                          key={
                            key
                          }
                          className="mt-4"
                        >
                          <label
                            className={
                              labelClass
                            }
                          >
                            {
                              label
                            }
                          </label>

                          <textarea
                            className={
                              textareaClass
                            }
                            value={
                              item[
                                key as keyof DailyItineraryItem
                              ]
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDailyItineraryItem(
                                item.id,
                                key as keyof DailyItineraryItem,
                                event
                                  .target
                                  .value,
                              )
                            }
                          />
                        </div>
                      ),
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          removeDailyItineraryItem(
                            item.id,
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Remove
                        Day
                      </button>
                    </div>
                  </div>
                ),
              )}

              {form
                .dailyItinerary
                .length ===
                0 && (
                <p className="text-sm text-slate-500">
                  No daily
                  itinerary
                  entered yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Payment /
                Cash
                Responsibilities
              </h3>

              <button
                type="button"
                onClick={
                  addPaymentResponsibility
                }
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Add
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {form.paymentResponsibilities.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <input
                        className={
                          inputClass
                        }
                        placeholder="Item / Fee"
                        value={
                          item.item
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePaymentResponsibility(
                            item.id,
                            "item",
                            event
                              .target
                              .value,
                          )
                        }
                      />

                      <input
                        className={
                          inputClass
                        }
                        placeholder="Responsible Person"
                        value={
                          item.responsiblePerson
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePaymentResponsibility(
                            item.id,
                            "responsiblePerson",
                            event
                              .target
                              .value,
                          )
                        }
                      />

                      <input
                        className={
                          inputClass
                        }
                        placeholder="Amount"
                        value={
                          item.amount
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePaymentResponsibility(
                            item.id,
                            "amount",
                            event
                              .target
                              .value,
                          )
                        }
                      />

                      <input
                        className={
                          inputClass
                        }
                        placeholder="Currency"
                        value={
                          item.currency
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePaymentResponsibility(
                            item.id,
                            "currency",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </div>

                    <div className="mt-4">
                      <textarea
                        className={
                          textareaClass
                        }
                        placeholder="Notes"
                        value={
                          item.notes
                        }
                        onChange={(
                          event,
                        ) =>
                          updatePaymentResponsibility(
                            item.id,
                            "notes",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={
                            item.confirmed
                          }
                          onChange={(
                            event,
                          ) =>
                            updatePaymentResponsibility(
                              item.id,
                              "confirmed",
                              event
                                .target
                                .checked,
                            )
                          }
                        />

                        Confirmed
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          removePaymentResponsibility(
                            item.id,
                          )
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {[
            [
              "generalInstructions",
              "General Daily Instructions",
            ],
            [
              "lunchInstructions",
              "Lunch Arrangements",
            ],
            [
              "drivingInstructions",
              "Driving / Rest Break Instructions",
            ],
            [
              "folderNotes",
              "Tour Manager Folder Notes",
            ],
            [
              "finalNotes",
              "Final Operations Notes",
            ],
          ].map(
            ([
              key,
              title,
            ]) => (
              <div
                key={
                  key
                }
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {
                    title
                  }
                </h3>

                <textarea
                  className={`${textareaClass} mt-4 min-h-36`}
                  value={
                    form[
                      key as
                        | "generalInstructions"
                        | "lunchInstructions"
                        | "drivingInstructions"
                        | "folderNotes"
                        | "finalNotes"
                    ]
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        [key]:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            ),
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {
            message
          }
        </div>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="submit"
          disabled={
            loading
          }
          className="rounded-xl bg-[#8B0000] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Saving..."
            : "Save Operations & Tour Management"}
        </button>
      </div>
    </form>
  );
}