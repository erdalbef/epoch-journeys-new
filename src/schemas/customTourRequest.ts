import { z } from "zod"

const optionalString = z.string().optional()

const optionalDate = z.preprocess((value) => {
  if (value === "" || value == null) return undefined
  return value
}, z.coerce.date().optional())

const optionalPositiveInt = z.preprocess((value) => {
  if (value === "" || value == null) return undefined
  if (typeof value === "number" && Number.isNaN(value)) return undefined
  return value
}, z.number().int().positive().optional())

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value == null) return undefined
  if (typeof value === "number" && Number.isNaN(value)) return undefined
  return value
}, z.number().positive().optional())

const defaultPositiveInt = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === "" || value == null) return defaultValue
    if (typeof value === "number" && Number.isNaN(value)) return defaultValue
    return value
  }, z.number().int().min(1))

const defaultNonNegativeInt = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === "" || value == null) return defaultValue
    if (typeof value === "number" && Number.isNaN(value)) return defaultValue
    return value
  }, z.number().int().min(0))

const defaultBoolean = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value == null) return defaultValue
    return value
  }, z.boolean())

export const customTourRequestSchema = z.object({
  // identity
  title: optionalString,
  requestName: optionalString,

  // destination
  destination: optionalString,
  destinations: z
    .array(z.string())
    .min(1, "At least one destination is required"),

  // dates
  startDate: optionalDate,
  endDate: optionalDate,
  durationDays: optionalPositiveInt,

  // pax
  estimatedPax: optionalPositiveInt,

  adults: defaultPositiveInt(1),
  children: defaultNonNegativeInt(0),
  infants: defaultNonNegativeInt(0),

  // rooms
  singleRooms: defaultNonNegativeInt(0),
  doubleRooms: defaultNonNegativeInt(0),
  twinRooms: defaultNonNegativeInt(0),
  tripleRooms: defaultNonNegativeInt(0),

  // service
  accommodationLevel: optionalString,
  roomPreference: optionalString,

  landOnly: defaultBoolean(true),
  needsFlights: defaultBoolean(false),

  // budget
  budgetPerPerson: optionalPositiveNumber,
  totalBudget: optionalPositiveNumber,
  currency: z.string().default("EUR"),

  // group / client
  companyName: optionalString,
  groupName: optionalString,
  groupLeaderName: optionalString,

  customerName: optionalString,
  customerEmail: z.string().email().optional(),
  customerPhone: optionalString,

  // lead traveler
  leadFirstName: optionalString,
  leadLastName: optionalString,
  leadEmail: z.string().email().optional(),
  leadPhone: optionalString,

  // notes
  specialRequests: optionalString,
  notes: optionalString,
})

export type CustomTourRequestFormValues = z.input<
  typeof customTourRequestSchema
>

export type CustomTourRequestInput = z.output<
  typeof customTourRequestSchema
>