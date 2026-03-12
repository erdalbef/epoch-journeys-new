"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      remove?: (widgetId?: string) => void;
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
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [membership, setMembership] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [turnstileToken, setTurnstileToken] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const emailNormalized = useMemo(() => email.trim().toLowerCase(), [email]);

  const websiteRequired =
    partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

  const agencyRequired =
    partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

  function validate(): string | null {
    if (!partnerType) return "Please select Partner Type.";
    if (!fullName.trim()) return "Full name is required.";

    if (agencyRequired && !travelAgency.trim()) {
      return "Travel Agency is required.";
    }

    if (!phone.trim()) return "Phone is required.";

    if (websiteRequired && !website.trim()) {
      return "Website is required.";
    }

    if (!membership.trim()) return "Membership is required.";

    if (!emailNormalized) return "Email is required.";
    if (!isValidEmail(emailNormalized)) {
      return "Please enter a valid email address.";
    }

    if (!password) return "Password is required.";
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!confirmPassword) return "Please confirm your password.";
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    if (!turnstileToken) {
      return "Please complete the security verification.";
    }

    return null;
  }

  function resetTurnstileState() {
    setTurnstileToken("");
    setTurnstileReady(false);
    setTurnstileError(null);
  }

  function resetWidget() {
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setTurnstileToken("");
    setTurnstileError(null);
  }

  function renderTurnstile() {
    if (!window.turnstile) return;
    if (!containerRef.current) return;
    if (widgetIdRef.current) return;

    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey) {
      setTurnstileError("Security verification is not configured correctly.");
      return;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey,
        callback: (token: string) => {
          setTurnstileToken(token);
          setTurnstileError(null);
          setTurnstileReady(true);
        },
        "expired-callback": () => {
          setTurnstileToken("");
          setTurnstileError("Security verification expired. Please verify again.");
        },
        "error-callback": () => {
          setTurnstileToken("");
          setTurnstileError(
            "Security verification could not be completed. Please retry."
          );
        },
      });

      setTurnstileReady(true);
      setTurnstileError(null);
    } catch {
      setTurnstileError(
        "Security verification failed to load. Please retry or use another browser."
      );
    }
  }

  function retryTurnstile() {
    setTurnstileToken("");
    setTurnstileError(null);

    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
      return;
    }

    renderTurnstile();
  }

  useEffect(() => {
    if (scriptLoaded) {
      renderTurnstile();
    }
  }, [scriptLoaded]);

  function resetForm() {
    setPartnerType("");
    setFullName("");
    setTravelAgency("");
    setPhone("");
    setWebsite("");
    setMembership("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCompanyName("");
    setError(null);
    setPasswordError(null);
    resetWidget();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setPasswordError(null);
    setOk(false);

    const err = validate();
    if (err) {
      if (err === "Passwords do not match.") {
        setPasswordError(err);
      } else {
        setError(err);
      }
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/agents/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerType,
          fullName: fullName.trim(),
          travelAgency: travelAgency.trim() || null,
          phone: phone.trim(),
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
          data?.error ? String(data.error) : `Request failed (HTTP ${res.status}).`
        );
        resetWidget();
        return;
      }

      setOk(true);
      resetForm();
    });
  }

  if (ok) {
    return (
      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-green-800">
            Request Submitted Successfully
          </h2>
          <p className="text-sm text-green-800">
            Thank you for your interest in partnering with us.
          </p>
          <p className="text-sm text-green-800">
            Your application has been received and is currently under review by our team.
          </p>
          <p className="text-sm text-green-800">
            Once approved, you will be able to access the B2B platform.
          </p>
        </div>
      </div>
    );
  }

  const submitDisabled = isPending || !turnstileToken;

  return (
    <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() =>
          setTurnstileError(
            "Security verification script could not be loaded. Please retry or use another browser."
          )
        }
      />

      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-bold text-[#001F3F]">Request Partnership</h2>
        <p className="text-sm text-muted-foreground">
          Apply for access to our B2B partner platform. All requests are reviewed
          before approval.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="hidden" aria-hidden="true">
          <label htmlFor="companyName">Company Name</label>
          <input
            id="companyName"
            name="companyName"
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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isPending}
            placeholder="Your full name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Travel Agency {agencyRequired ? <span className="text-red-700">*</span> : null}
          </label>
          <Input
            value={travelAgency}
            onChange={(e) => setTravelAgency(e.target.value)}
            disabled={isPending}
            placeholder="Your travel agency name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Phone <span className="text-red-700">*</span>
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isPending}
            placeholder="+1 ..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Website {websiteRequired ? <span className="text-red-700">*</span> : null}
          </label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={isPending}
            placeholder="https://..."
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            placeholder="name@domain.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Password <span className="text-red-700">*</span>
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
            disabled={isPending}
            placeholder="Minimum 8 characters"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Confirm Password <span className="text-red-700">*</span>
          </label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError(null);
            }}
            disabled={isPending}
            placeholder="Re-enter your password"
          />
          {passwordError ? (
            <p className="text-sm text-red-700">{passwordError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Security Check <span className="text-red-700">*</span>
          </label>

          <div ref={containerRef} id="turnstile-container" />

          {!scriptLoaded && !turnstileError ? (
            <p className="text-xs text-muted-foreground">
              Loading security verification...
            </p>
          ) : null}

          {turnstileError ? (
            <div className="space-y-2">
              <p className="text-sm text-red-700">{turnstileError}</p>
              <button
                type="button"
                onClick={retryTurnstile}
                className="text-sm font-medium text-red-700 underline"
              >
                Retry security check
              </button>
            </div>
          ) : null}

          {turnstileReady && !turnstileToken && !turnstileError ? (
            <p className="text-xs text-muted-foreground">
              Please complete the security verification before submitting.
            </p>
          ) : null}
        </div>

        <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
          Access is granted only after your application is reviewed and approved by
          our team.
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full bg-[#8B0000] hover:bg-[#6f0000]"
          disabled={submitDisabled}
        >
          {isPending ? "Submitting..." : "Submit Request"}
        </Button>

        <p className="text-xs text-muted-foreground">
          If security verification keeps failing, please contact us directly so we can review your application manually.
        </p>
      </form>
    </div>
  );
}