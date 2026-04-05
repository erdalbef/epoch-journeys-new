"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  customTourRequestSchema,
  type CustomTourRequestFormValues,
  type CustomTourRequestInput,
} from "@/schemas/customTourRequest"

type QuoteRequestFormProps = {
  userId: string
  defaultValues?: Partial<CustomTourRequestFormValues>
  onSuccessRedirect?: string
}

const accommodationOptions = [
  "3 Star",
  "4 Star",
  "5 Star",
  "Boutique",
  "Luxury",
]

const roomPreferenceOptions = [
  "Single",
  "Double",
  "Twin",
  "Triple",
  "Flexible",
]

export default function QuoteRequestForm({
  userId,
  defaultValues,
  onSuccessRedirect,
}: QuoteRequestFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const initialValues = useMemo<CustomTourRequestFormValues>(
    () => ({
      title: defaultValues?.title ?? "",
      requestName: defaultValues?.requestName ?? "",
      destination: defaultValues?.destination ?? "",
      destinations: defaultValues?.destinations ?? [""],

      startDate: defaultValues?.startDate,
      endDate: defaultValues?.endDate,
      durationDays: defaultValues?.durationDays,

      estimatedPax: defaultValues?.estimatedPax,

      adults: defaultValues?.adults ?? 1,
      children: defaultValues?.children ?? 0,
      infants: defaultValues?.infants ?? 0,

      singleRooms: defaultValues?.singleRooms ?? 0,
      doubleRooms: defaultValues?.doubleRooms ?? 0,
      twinRooms: defaultValues?.twinRooms ?? 0,
      tripleRooms: defaultValues?.tripleRooms ?? 0,

      accommodationLevel: defaultValues?.accommodationLevel ?? "",
      roomPreference: defaultValues?.roomPreference ?? "",

      landOnly: defaultValues?.landOnly ?? true,
      needsFlights: defaultValues?.needsFlights ?? false,

      budgetPerPerson: defaultValues?.budgetPerPerson,
      totalBudget: defaultValues?.totalBudget,
      currency: defaultValues?.currency ?? "EUR",

      companyName: defaultValues?.companyName ?? "",
      groupName: defaultValues?.groupName ?? "",
      groupLeaderName: defaultValues?.groupLeaderName ?? "",

      customerName: defaultValues?.customerName ?? "",
      customerEmail: defaultValues?.customerEmail ?? "",
      customerPhone: defaultValues?.customerPhone ?? "",

      leadFirstName: defaultValues?.leadFirstName ?? "",
      leadLastName: defaultValues?.leadLastName ?? "",
      leadEmail: defaultValues?.leadEmail ?? "",
      leadPhone: defaultValues?.leadPhone ?? "",

      specialRequests: defaultValues?.specialRequests ?? "",
      notes: defaultValues?.notes ?? "",
    }),
    [defaultValues]
  )

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomTourRequestFormValues, unknown, CustomTourRequestInput>({
    resolver: zodResolver(customTourRequestSchema),
    defaultValues: initialValues,
  })

  const watchedDestinations = useWatch({
    control,
    name: "destinations",
  })

  const destinations: string[] = Array.isArray(watchedDestinations)
    ? watchedDestinations
    : [""]

  const addDestination = () => {
    setValue("destinations", [...destinations, ""], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const updateDestination = (index: number, value: string) => {
    const next = [...destinations]
    next[index] = value
    setValue("destinations", next, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const removeDestination = (index: number) => {
    const next = destinations.filter((_, i) => i !== index)
    setValue("destinations", next.length ? next : [""], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const onSubmit = (data: CustomTourRequestInput) => {
    setSuccessMessage("")
    setErrorMessage("")

    startTransition(async () => {
      try {
        const payload = {
          ...data,
          userId,
          destinations: data.destinations.map((item) => item.trim()).filter(Boolean),
          title: data.title?.trim() || undefined,
          requestName: data.requestName?.trim() || undefined,
          destination: data.destination?.trim() || undefined,
          accommodationLevel: data.accommodationLevel?.trim() || undefined,
          roomPreference: data.roomPreference?.trim() || undefined,
          companyName: data.companyName?.trim() || undefined,
          groupName: data.groupName?.trim() || undefined,
          groupLeaderName: data.groupLeaderName?.trim() || undefined,
          customerName: data.customerName?.trim() || undefined,
          customerEmail: data.customerEmail?.trim() || undefined,
          customerPhone: data.customerPhone?.trim() || undefined,
          leadFirstName: data.leadFirstName?.trim() || undefined,
          leadLastName: data.leadLastName?.trim() || undefined,
          leadEmail: data.leadEmail?.trim() || undefined,
          leadPhone: data.leadPhone?.trim() || undefined,
          specialRequests: data.specialRequests?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
        }

        const response = await fetch("/api/quote-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const result = await response.json()

        if (!response.ok) {
          setErrorMessage(result.message || "Failed to submit quote request.")
          return
        }

        setSuccessMessage("Quote request submitted successfully.")

        if (onSuccessRedirect) {
          router.push(onSuccessRedirect)
          return
        }

        router.refresh()
      } catch (error) {
        console.error(error)
        setErrorMessage("Something went wrong while submitting the form.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section className="space-y-6 rounded-xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">Trip Overview</h2>
          <p className="text-sm text-muted-foreground">
            Enter the main travel request details.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              {...register("title")}
              placeholder="Example: Scotland Custom Tour"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="requestName" className="text-sm font-medium">
              Request Name
            </label>
            <input
              id="requestName"
              {...register("requestName")}
              placeholder="Internal or customer-friendly name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.requestName && (
              <p className="text-sm text-red-600">{errors.requestName.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="destination" className="text-sm font-medium">
              Main Destination
            </label>
            <input
              id="destination"
              {...register("destination")}
              placeholder="Example: Scotland"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.destination && (
              <p className="text-sm text-red-600">{errors.destination.message}</p>
            )}
          </div>

          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Destinations</label>
              <button
                type="button"
                onClick={addDestination}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Add destination
              </button>
            </div>

            <div className="space-y-3">
              {destinations.map((value, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={value}
                    onChange={(e) => updateDestination(index, e.target.value)}
                    placeholder={`Destination ${index + 1}`}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeDestination(index)}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                    disabled={destinations.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {errors.destinations && (
              <p className="text-sm text-red-600">
                {errors.destinations.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="startDate" className="text-sm font-medium">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              {...register("startDate", { valueAsDate: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.startDate && (
              <p className="text-sm text-red-600">
                {errors.startDate.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="endDate" className="text-sm font-medium">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              {...register("endDate", { valueAsDate: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.endDate && (
              <p className="text-sm text-red-600">
                {errors.endDate.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="durationDays" className="text-sm font-medium">
              Duration (days)
            </label>
            <input
              id="durationDays"
              type="number"
              min="1"
              {...register("durationDays", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.durationDays && (
              <p className="text-sm text-red-600">{errors.durationDays.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="estimatedPax" className="text-sm font-medium">
              Estimated Pax
            </label>
            <input
              id="estimatedPax"
              type="number"
              min="1"
              {...register("estimatedPax", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.estimatedPax && (
              <p className="text-sm text-red-600">{errors.estimatedPax.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">Passenger & Rooming</h2>
          <p className="text-sm text-muted-foreground">
            Capture traveler and room breakdown.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="adults" className="text-sm font-medium">
              Adults
            </label>
            <input
              id="adults"
              type="number"
              min="1"
              {...register("adults", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.adults && (
              <p className="text-sm text-red-600">{errors.adults.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="children" className="text-sm font-medium">
              Children
            </label>
            <input
              id="children"
              type="number"
              min="0"
              {...register("children", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.children && (
              <p className="text-sm text-red-600">{errors.children.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="infants" className="text-sm font-medium">
              Infants
            </label>
            <input
              id="infants"
              type="number"
              min="0"
              {...register("infants", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.infants && (
              <p className="text-sm text-red-600">{errors.infants.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="singleRooms" className="text-sm font-medium">
              Single Rooms
            </label>
            <input
              id="singleRooms"
              type="number"
              min="0"
              {...register("singleRooms", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.singleRooms && (
              <p className="text-sm text-red-600">{errors.singleRooms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="doubleRooms" className="text-sm font-medium">
              Double Rooms
            </label>
            <input
              id="doubleRooms"
              type="number"
              min="0"
              {...register("doubleRooms", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.doubleRooms && (
              <p className="text-sm text-red-600">{errors.doubleRooms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="twinRooms" className="text-sm font-medium">
              Twin Rooms
            </label>
            <input
              id="twinRooms"
              type="number"
              min="0"
              {...register("twinRooms", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.twinRooms && (
              <p className="text-sm text-red-600">{errors.twinRooms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="tripleRooms" className="text-sm font-medium">
              Triple Rooms
            </label>
            <input
              id="tripleRooms"
              type="number"
              min="0"
              {...register("tripleRooms", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.tripleRooms && (
              <p className="text-sm text-red-600">{errors.tripleRooms.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">Service Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Define service level and trip preferences.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="accommodationLevel" className="text-sm font-medium">
              Accommodation Level
            </label>
            <select
              id="accommodationLevel"
              {...register("accommodationLevel")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select accommodation level</option>
              {accommodationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.accommodationLevel && (
              <p className="text-sm text-red-600">
                {errors.accommodationLevel.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="roomPreference" className="text-sm font-medium">
              Room Preference
            </label>
            <select
              id="roomPreference"
              {...register("roomPreference")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select room preference</option>
              {roomPreferenceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.roomPreference && (
              <p className="text-sm text-red-600">{errors.roomPreference.message}</p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium">
            <input type="checkbox" {...register("landOnly")} className="h-4 w-4" />
            Land only
          </label>

          <label className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              {...register("needsFlights")}
              className="h-4 w-4"
            />
            Needs flights
          </label>
        </div>
      </section>

      <section className="space-y-6 rounded-xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">Budget</h2>
          <p className="text-sm text-muted-foreground">
            Add budget expectations if available.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="budgetPerPerson" className="text-sm font-medium">
              Budget Per Person
            </label>
            <input
              id="budgetPerPerson"
              type="number"
              min="0"
              step="0.01"
              {...register("budgetPerPerson", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.budgetPerPerson && (
              <p className="text-sm text-red-600">
                {errors.budgetPerPerson.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="totalBudget" className="text-sm font-medium">
              Total Budget
            </label>
            <input
              id="totalBudget"
              type="number"
              min="0"
              step="0.01"
              {...register("totalBudget", { valueAsNumber: true })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.totalBudget && (
              <p className="text-sm text-red-600">{errors.totalBudget.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="currency" className="text-sm font-medium">
              Currency
            </label>
            <input
              id="currency"
              {...register("currency")}
              placeholder="EUR"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.currency && (
              <p className="text-sm text-red-600">{errors.currency.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">Customer & Group Details</h2>
          <p className="text-sm text-muted-foreground">
            Add contact details for the traveler, agency, or group lead.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="companyName" className="text-sm font-medium">
              Company / Agency Name
            </label>
            <input
              id="companyName"
              {...register("companyName")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.companyName && (
              <p className="text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="groupName" className="text-sm font-medium">
              Group Name
            </label>
            <input
              id="groupName"
              {...register("groupName")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.groupName && (
              <p className="text-sm text-red-600">{errors.groupName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="groupLeaderName" className="text-sm font-medium">
              Group Leader Name
            </label>
            <input
              id="groupLeaderName"
              {...register("groupLeaderName")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.groupLeaderName && (
              <p className="text-sm text-red-600">
                {errors.groupLeaderName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="customerName" className="text-sm font-medium">
              Customer Name
            </label>
            <input
              id="customerName"
              {...register("customerName")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.customerName && (
              <p className="text-sm text-red-600">{errors.customerName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="customerEmail" className="text-sm font-medium">
              Customer Email
            </label>
            <input
              id="customerEmail"
              type="email"
              {...register("customerEmail")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.customerEmail && (
              <p className="text-sm text-red-600">
                {errors.customerEmail.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="customerPhone" className="text-sm font-medium">
              Customer Phone
            </label>
            <input
              id="customerPhone"
              {...register("customerPhone")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.customerPhone && (
              <p className="text-sm text-red-600">{errors.customerPhone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="leadFirstName" className="text-sm font-medium">
              Lead First Name
            </label>
            <input
              id="leadFirstName"
              {...register("leadFirstName")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.leadFirstName && (
              <p className="text-sm text-red-600">{errors.leadFirstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="leadLastName" className="text-sm font-medium">
              Lead Last Name
            </label>
            <input
              id="leadLastName"
              {...register("leadLastName")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.leadLastName && (
              <p className="text-sm text-red-600">{errors.leadLastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="leadEmail" className="text-sm font-medium">
              Lead Email
            </label>
            <input
              id="leadEmail"
              type="email"
              {...register("leadEmail")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.leadEmail && (
              <p className="text-sm text-red-600">{errors.leadEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="leadPhone" className="text-sm font-medium">
              Lead Phone
            </label>
            <input
              id="leadPhone"
              {...register("leadPhone")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {errors.leadPhone && (
              <p className="text-sm text-red-600">{errors.leadPhone.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">Additional Notes</h2>
          <p className="text-sm text-muted-foreground">
            Add any custom requirements or remarks.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="specialRequests" className="text-sm font-medium">
              Special Requests
            </label>
            <textarea
              id="specialRequests"
              {...register("specialRequests")}
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Special room needs, dietary restrictions, accessibility, etc."
            />
            {errors.specialRequests && (
              <p className="text-sm text-red-600">
                {errors.specialRequests.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              {...register("notes")}
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Any extra information that will help prepare the quote"
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>
        </div>
      </section>

      {successMessage ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Submit Quote Request"}
        </button>
      </div>
    </form>
  )
}