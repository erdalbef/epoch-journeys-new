"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/shared/form/phoneInput";

type PartnerType =
  | "TOUR_OPERATOR"
  | "TRAVEL_AGENCY"
  | "TRAVEL_EXPERT"
  | "GROUP_LEADER";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export function RequestPartnershipForm() {
  const [isPending, startTransition] = useTransition();

  const [partnerType, setPartnerType] = useState<PartnerType | "">("");
  const [fullName, setFullName] = useState("");
  const [travelAgency, setTravelAgency] = useState("");

  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [website, setWebsite] = useState("");
  const [membership, setMembership] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const widgetRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const emailNormalized = useMemo(() => email.trim().toLowerCase(), [email]);
  const confirmEmailNormalized = useMemo(
    () => confirmEmail.trim().toLowerCase(),
    [confirmEmail]
  );

  const websiteRequired =
    partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

  const agencyRequired =
    partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

  const fullPhone = `${countryCode} ${phoneNumber.trim()}`.trim();

  function renderTurnstile() {
    if (typeof window === "undefined") return;

    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!sitekey) {
      console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY missing");
      setTurnstileError("Security verification is not configured correctly.");
      return;
    }

    if (!window.turnstile) return;
    if (!containerRef.current) return;
    if (widgetRef.current) return;

    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey,
      callback: (token: string) => {
        setTurnstileToken(token);
        setTurnstileError(null);
      },
      "expired-callback": () => {
        setTurnstileToken("");
        setTurnstileError("Security verification expired. Please retry.");
      },
      "error-callback": () => {
        setTurnstileToken("");
        setTurnstileError("Security verification failed. Please retry.");
      },
    });
  }

  function validate(): string | null {
    if (!partnerType) return "Please select Partner Type.";
    if (!fullName.trim()) return "Full name is required.";

    if (agencyRequired && !travelAgency.trim()) {
      return "Travel Agency is required.";
    }

    if (!countryCode.trim()) return "Country code is required.";
    if (!phoneNumber.trim()) return "Phone number is required.";

    if (websiteRequired && !website.trim()) {
      return "Website is required.";
    }

    if (!membership.trim()) return "Membership is required.";

    if (!emailNormalized) return "Email is required.";

    if (!isValidEmail(emailNormalized)) {
      return "Please enter a valid email address.";
    }

    if (!confirmEmailNormalized) {
      return "Please confirm your email address.";
    }

    if (emailNormalized !== confirmEmailNormalized) {
      return "Email addresses do not match.";
    }

    if (!password) return "Password is required.";

    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      return "Please confirm your password.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    if (!turnstileToken) {
      return "Please complete the security verification.";
    }

    return null;
  }

  function resetWidget() {
    if (typeof window === "undefined") return;

    if (window.turnstile && widgetRef.current) {
      window.turnstile.reset(widgetRef.current);
    }

    setTurnstileToken("");
  }

  function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setPasswordError(null);
    setEmailError(null);
    setTurnstileError(null);

    const err = validate();

    if (err) {
      if (err === "Passwords do not match.") {
        setPasswordError(err);
      } else if (err === "Email addresses do not match.") {
        setEmailError(err);
      } else {
        setError(err);
      }
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partnerType,
            fullName: fullName.trim(),
            travelAgency: travelAgency.trim() || null,
            phone: fullPhone,
            website: website.trim() || null,
            membership: membership.trim(),
            email: emailNormalized,
            password,
            companyName,
            turnstileToken,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setError(
            data?.error
              ? String(data.error)
              : `Request failed (HTTP ${res.status}).`
          );
          resetWidget();
          return;
        }

        setOk(true);
        setError(null);
        setPasswordError(null);
        setEmailError(null);
        setTurnstileError(null);
      } catch (err) {
        console.error("Request partnership failed:", err);
        setError("Something went wrong while submitting your request.");
        resetWidget();
      }
    });
  }

  useEffect(() => {
    renderTurnstile();
  }, []);

  if (ok) {
    return (
      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 text-center shadow-sm">
        <h2 className="text-xl font-bold text-green-800">
          Request Submitted Successfully
        </h2>

        <p className="mt-2 text-sm text-green-800">
          Your partnership request has been received and is under review. You
          will receive an email once your account is approved.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Home
          </Link>

          <Link
            href="/agent-login"
            className="rounded-md bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Agent Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => renderTurnstile()}
      />

      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-bold text-[#001F3F]">
          Request Partnership
        </h2>
        <p className="text-sm text-muted-foreground">
          Travel advisors and group leaders may request access. Your account
          will be reviewed before approval.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="hidden">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Partner Type <span className="text-red-700">*</span>
          </label>
          <select
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value as PartnerType | "")}
            className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            disabled={isPending}
          >
            <option value="">Select...</option>
            <option value="TOUR_OPERATOR">Tour Operator</option>
            <option value="TRAVEL_AGENCY">Travel Agency</option>
            <option value="TRAVEL_EXPERT">Travel Advisor / Expert</option>
            <option value="GROUP_LEADER">Group Leader</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Full Name <span className="text-red-700">*</span>
          </label>
          <Input
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Travel Agency{" "}
            {agencyRequired ? <span className="text-red-700">*</span> : null}
          </label>
          <Input
            placeholder="Your travel agency name"
            value={travelAgency}
            onChange={(e) => setTravelAgency(e.target.value)}
            disabled={isPending}
          />
        </div>

        <PhoneInput
          label="Phone"
          codeValue={countryCode}
          numberValue={phoneNumber}
          onCodeChange={setCountryCode}
          onNumberChange={setPhoneNumber}
          required
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Website{" "}
            {websiteRequired ? <span className="text-red-700">*</span> : null}
          </label>
          <Input
            placeholder="https://..."
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Membership <span className="text-red-700">*</span>
          </label>
          <select
            value={membership}
            onChange={(e) => setMembership(e.target.value)}
            className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            disabled={isPending}
          >
            <option value="">Select...</option>
            <option value="ASTA">ASTA</option>
            <option value="NTA">NTA</option>
            <option value="IATA">IATA</option>
            <option value="CLIA">CLIA</option>
            <option value="None">None</option>
          </select>
          <p className="text-xs text-muted-foreground">
            One membership entry is sufficient.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Email <span className="text-red-700">*</span>
          </label>
          <Input
            placeholder="name@domain.com"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Confirm Email <span className="text-red-700">*</span>
          </label>
          <Input
            placeholder="Re-enter your email address"
            type="email"
            value={confirmEmail}
            onChange={(e) => {
              setConfirmEmail(e.target.value);
              setEmailError(null);
            }}
            disabled={isPending}
          />
          {emailError ? (
            <p className="text-sm text-red-700">{emailError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Password <span className="text-red-700">*</span>
          </label>
          <Input
            placeholder="Minimum 8 characters"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Confirm Password <span className="text-red-700">*</span>
          </label>
          <Input
            placeholder="Re-enter your password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError(null);
            }}
            disabled={isPending}
          />
          {passwordError ? (
            <p className="text-sm text-red-700">{passwordError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Security Verification <span className="text-red-700">*</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Verification may complete automatically for trusted visitors.
          </p>

          <div ref={containerRef} />

          {turnstileToken && !turnstileError ? (
            <p className="text-sm text-green-700">
              Security verification completed.
            </p>
          ) : null}

          {turnstileError ? (
            <p className="mt-2 text-sm text-red-700">{turnstileError}</p>
          ) : null}
        </div>

        <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
          Access is granted only after your application is reviewed and approved
          by our team.
        </div>

        {error ? <div className="text-sm text-red-700">{error}</div> : null}

        <Button
          type="submit"
          className="w-full bg-[#8B0000] hover:bg-[#6f0000]"
          disabled={isPending || !turnstileToken}
        >
          {isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </div>
  );
}