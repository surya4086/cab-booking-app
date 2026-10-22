import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import DriverDashboard from "./DriverDashboard";
import RideMap from "./RideMap";
import LoginBackdrop from "./LoginBackdrop";

const API_BASE = "https://cab-booking-app-4rla.onrender.com/api";

type Ride = {
  id: number;
  riderId: number;
  driverId: number | null;
  pickupAddress: string;
  destinationAddress: string;
  distanceKm: number;
  estimatedFare: number;
  status: string;
  createdAt: string;
  // Optional: shown on the tracking card only if the backend returns them.
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleModel?: string | null;
  vehicleNumber?: string | null;
  otp?: string | null;
};

type Payment = {
  id: number;
  rideId: number;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  paymentMethod: string;
  createdAt?: string;
};

type DriverRatingSummary = {
  driverId: number;
  averageRating: number;
  totalRatings: number;
};

type DriverReview = {
  id: number;
  rideId: number;
  driverId: number;
  riderId: number;
  stars: number;
  comment: string | null;
  createdAt: string;
};

type FareEstimate = {
  distanceKm: number;
  estimatedFare: number;
};

type LoginResponse = {
  token: string;
  tokenType: string;
  userId: number;
  fullName: string;
  email: string;
  role: "RIDER" | "DRIVER" | "ADMIN";
};

type PasswordResetStep = "email" | "otp" | "reset";

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/register/driver",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
];

type LocationResult = {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
  address?: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
};

// Turns a backend error body (JSON or plain text) into a readable message.
function readableError(raw: string, fallback: string): string {
  if (!raw) return fallback;
  try {
    const details = JSON.parse(raw);
    return details.message || details.error || fallback;
  } catch {
    return raw;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // Attach JWT only to non-public authentication requests.
  if (token && !PUBLIC_AUTH_PATHS.includes(path)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      readableError(body, `Request failed (${response.status})`)
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // Read as text first so empty or plain-text success responses don't crash.
  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3";
const primaryButtonClass =
  "w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50";

// NOTE: ride-type prices are display-only. They multiply the backend fare
// estimate; the backend does not receive the vehicle type yet.
const RIDE_TYPES = [
  { id: "bike", name: "Bike", icon: "🏍️", seats: 1, factor: 0.6, blurb: "quickest in traffic" },
  { id: "auto", name: "Auto", icon: "🛺", seats: 3, factor: 0.8, blurb: "budget friendly" },
  { id: "mini", name: "Mini", icon: "🚕", seats: 4, factor: 1, blurb: "everyday hatchback" },
  { id: "sedan", name: "Sedan", icon: "🚖", seats: 4, factor: 1.25, blurb: "extra legroom" },
  { id: "suv", name: "SUV", icon: "🚙", seats: 6, factor: 1.6, blurb: "groups and luggage" },
];

const ACTIVE_STATUSES = ["REQUESTED", "ACCEPTED", "DRIVER_ARRIVING", "IN_PROGRESS"];

const STATUS_COPY: Record<string, { title: string; sub: string }> = {
  REQUESTED: {
    title: "Finding your driver...",
    sub: "We're notifying nearby drivers.",
  },
  ACCEPTED: {
    title: "Driver is on the way",
    sub: "Your driver accepted the ride.",
  },
  DRIVER_ARRIVING: {
    title: "Driver is arriving",
    sub: "Head to your pickup point.",
  },
  IN_PROGRESS: { title: "Enjoy your ride", sub: "You're on your way." },
};

function AuthenticatedDriverDashboard() {
  const [driverId, setDriverId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDriverId() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in as a driver.");
        }

        const response = await fetch(`${API_BASE}/drivers/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? "Access denied. Please log in with a driver account."
              : `Could not load driver profile (${response.status}).`
          );
        }

        const data: { driverId: number } = await response.json();

        if (!cancelled) {
          setDriverId(data.driverId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load driver profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDriverId();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="p-6 text-slate-300">Loading driver profile...</p>;
  }

  if (error || driverId === null) {
    return (
      <p role="alert" className="p-6 text-red-300">
        {error || "Driver profile not found."}
      </p>
    );
  }

  return <DriverDashboard DRIVER_ID={driverId} />;
}

function App() {
  const [dashboard, setDashboard] = useState<"rider" | "driver">("rider");

  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<"RIDER" | "DRIVER">("RIDER");
  const [registerError, setRegisterError] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [pickupSuggestions, setPickupSuggestions] = useState<LocationResult[]>(
    []
  );
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    LocationResult[]
  >([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState<
    "pickup" | "destination" | null
  >(null);

  const [pickupAddress, setPickupAddress] = useState(
    "Quantum University, Roorkee"
  );
  const [destinationAddress, setDestinationAddress] = useState(
    "Roorkee Railway Station"
  );
  const [pickupLatitude, setPickupLatitude] = useState("29.8543");
  const [pickupLongitude, setPickupLongitude] = useState("77.8880");
  const [destinationLatitude, setDestinationLatitude] = useState("29.8540");
  const [destinationLongitude, setDestinationLongitude] = useState("77.8885");

  const [fare, setFare] = useState<FareEstimate | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<PasswordResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [payments, setPayments] = useState<Record<number, Payment>>({});
  const [payingRideId, setPayingRideId] = useState<number | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [cancellingRideId, setCancellingRideId] = useState<number | null>(null);

  // Driver rating form state
  const [ratingStars, setRatingStars] = useState<Record<number, number>>({});
  const [ratingComments, setRatingComments] = useState<Record<number, string>>(
    {}
  );
  const [ratingSubmittingRideId, setRatingSubmittingRideId] = useState<
    number | null
  >(null);
  const [ratingFeedback, setRatingFeedback] = useState<Record<number, string>>(
    {}
  );
  const [ratedRideIds, setRatedRideIds] = useState<number[]>([]);
  const [driverRatingSummaries, setDriverRatingSummaries] = useState<
    Record<number, DriverRatingSummary>
  >({});
  const [driverReviews, setDriverReviews] = useState<
    Record<number, DriverReview[]>
  >({});
  const [driverReviewsLoading, setDriverReviewsLoading] = useState<
    Record<number, boolean>
  >({});
  const [driverReviewsError, setDriverReviewsError] = useState<
    Record<number, string>
  >({});

  // ---- Cab-app UI state ----
  const [riderTab, setRiderTab] = useState<"book" | "rides">("book");
  const [rideType, setRideType] = useState("mini");
  const [bookAnother, setBookAnother] = useState(false);
  const [pickMode, setPickMode] = useState<"pickup" | "destination" | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<{
    field: "pickup" | "destination";
    text: string;
  } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);

  const activeRide =
    rides
      .filter((ride) => ACTIVE_STATUSES.includes(ride.status))
      .sort((a, b) => b.id - a.id)[0] ?? null;
  const activeDriverId = activeRide?.driverId ?? null;

  // Place autocomplete: starts 0.7s after the rider stops typing.
  useEffect(() => {
    if (!searchQuery) return;

    const { field, text } = searchQuery;
    const query = text.trim();
    const setSuggestions =
      field === "pickup" ? setPickupSuggestions : setDestinationSuggestions;

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLocationSearchLoading(field);

      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          limit: "6",
          countrycodes: "in",
          addressdetails: "1",
          q: query,
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Place search is unavailable.");

        setSuggestions(await response.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLocationSearchLoading(null);
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Load rides as soon as the rider logs in, so an active ride shows up.
  useEffect(() => {
    if (user) void loadRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // While a ride is active, refresh its status every 8 seconds.
  useEffect(() => {
    if (!user || !activeRide) return;
    const timer = window.setInterval(() => void loadRides(), 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeRide?.id, activeRide?.status]);

  // Show the assigned driver's rating on the tracking card.
  useEffect(() => {
    if (activeDriverId !== null && !driverRatingSummaries[activeDriverId]) {
      void loadDriverReviews(activeDriverId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDriverId]);

  // Success messages fade away on their own.
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  /* ---------------------------- Authentication --------------------------- */

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setLoginLoading(true);

    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      localStorage.setItem("token", result.token);
      setUser(result);
      setLoginPassword("");
      setDashboard(result.role === "DRIVER" ? "driver" : "rider");
    } catch (err) {
      setAuthError(
        err instanceof Error && err.message
          ? err.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setRides([]);
    setFare(null);
    setMessage("");
    setError("");
    setRiderTab("book");
    setBookAnother(false);
    setDashboard("rider");
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterError("");
    setLoginLoading(true);

    try {
      const endpoint =
        registerRole === "DRIVER" ? "/auth/register/driver" : "/auth/register";

      const commonPayload = {
        fullName: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        phone: registerPhone.trim(),
      };

      const payload =
        registerRole === "DRIVER"
          ? {
              ...commonPayload,
              licenseNumber: licenseNumber.trim(),
              vehicleModel: vehicleModel.trim(),
              vehicleNumber: vehicleNumber.trim(),
            }
          : commonPayload;

      await apiRequest<unknown>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Show the success message on the login screen, because the
      // register form is hidden as soon as registration succeeds.
      setLoginEmail(registerEmail.trim());
      setLoginPassword("");
      setShowRegister(false);
      setAuthError("");
      setAuthSuccess("Account created successfully. Please log in.");

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPhone("");
      setRegisterPassword("");
      setLicenseNumber("");
      setVehicleModel("");
      setVehicleNumber("");
    } catch (err) {
      setRegisterError(
        err instanceof Error ? err.message : "Registration failed."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  /* ---------------------------- Password reset --------------------------- */

  function openForgotPassword() {
    setShowForgotPassword(true);
    setShowRegister(false);
    setResetEmail(loginEmail);
    setResetStep("email");
    setResetOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetError("");
    setResetMessage("");
    setAuthError("");
    setAuthSuccess("");
  }

  function returnToLogin() {
    setShowForgotPassword(false);
    setShowRegister(false);
    setResetStep("email");
    setResetOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetError("");
    setResetMessage("");
    setRegisterError("");
    setAuthError("");
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetLoading(true);

    try {
      await apiRequest<unknown>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail.trim() }),
      });

      setResetStep("otp");
      setResetMessage(
        "If the account exists, a verification code has been sent to the registered email."
      );
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : "Could not request a verification code."
      );
    } finally {
      setResetLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetLoading(true);

    try {
      await apiRequest<unknown>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: resetOtp.trim(),
        }),
      });

      setResetStep("reset");
      setResetMessage("Email verified. You can now choose a new password.");
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : "Verification failed. Check your code."
      );
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError("");
    setResetMessage("");

    if (newPassword.length < 8) {
      setResetError("Your new password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError("The passwords do not match.");
      return;
    }

    setResetLoading(true);

    try {
      await apiRequest<unknown>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: resetOtp.trim(),
          newPassword,
        }),
      });

      setLoginEmail(resetEmail.trim());
      setLoginPassword("");
      setShowForgotPassword(false);
      setResetStep("email");
      setResetOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetMessage("");
      setAuthError("");
      setShowRegister(false);
      setAuthSuccess(
        "Password reset successfully. Please log in with your new password."
      );
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Could not reset your password."
      );
    } finally {
      setResetLoading(false);
    }
  }

  /* ------------------------------ Geocoding ------------------------------ */

  async function findPlaceName(lat: number, lng: number): Promise<string> {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(lat),
      lon: String(lng),
      zoom: "18",
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Could not identify this location.");
    }

    const result = await response.json();

    return result.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  /* ------------------------------- Rides --------------------------------- */

  function getRequestData() {
    return {
      riderId: user?.userId,
      pickupAddress: pickupAddress.trim(),
      destinationAddress: destinationAddress.trim(),
      pickupLatitude: Number(pickupLatitude),
      pickupLongitude: Number(pickupLongitude),
      destinationLatitude: Number(destinationLatitude),
      destinationLongitude: Number(destinationLongitude),
    };
  }

  function validateForm() {
    if (!pickupAddress.trim() || !destinationAddress.trim()) {
      setError("Enter both pickup and destination addresses.");
      return false;
    }

    const values = [
      pickupLatitude,
      pickupLongitude,
      destinationLatitude,
      destinationLongitude,
    ];

    if (values.some((value) => value.trim() === "")) {
      setError("Choose both a pickup point and a destination.");
      return false;
    }

    const [lat1, lon1, lat2, lon2] = values.map(Number);

    if (
      !Number.isFinite(lat1) ||
      !Number.isFinite(lon1) ||
      !Number.isFinite(lat2) ||
      !Number.isFinite(lon2) ||
      Math.abs(lat1) > 90 ||
      Math.abs(lat2) > 90 ||
      Math.abs(lon1) > 180 ||
      Math.abs(lon2) > 180
    ) {
      setError("Enter valid latitude and longitude values.");
      return false;
    }

    return true;
  }

  async function estimateFare() {
    setError("");
    setMessage("");
    setFare(null);

    if (!validateForm()) return;
    setLoading(true);

    try {
      const result = await apiRequest<FareEstimate>("/rides/fare-estimate", {
        method: "POST",
        body: JSON.stringify(getRequestData()),
      });

      setFare(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not estimate fare.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMockPayment(ride: Ride) {
    setPaymentError("");
    setPaymentMessage("");
    setPayingRideId(ride.id);

    try {
      // 1. Create or retrieve the pending mock payment.
      const payment = await apiRequest<Payment>(
        `/payments/rides/${ride.id}/status`
      );

      let finalPayment = payment;

      // 2. Simulate success only if the payment is pending.
      if (payment.status === "PENDING") {
        finalPayment = await apiRequest<Payment>(
          `/payments/${payment.id}/mock-process?success=true`,
          { method: "POST" }
        );
      }

      // 3. Retrieve the saved payment status.
      const verifiedPayment = await apiRequest<Payment>(
        `/payments/${finalPayment.id}`
      );

      setPayments((previous) => ({
        ...previous,
        [ride.id]: verifiedPayment,
      }));

      if (verifiedPayment.status === "SUCCESS") {
        setPaymentMessage(
          `Mock payment successful: ₹${Number(verifiedPayment.amount).toFixed(
            2
          )} for Ride #${ride.id}. No real money was charged.`
        );
      } else {
        setPaymentError(`Payment status: ${verifiedPayment.status}.`);
      }
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Could not process mock payment."
      );
    } finally {
      setPayingRideId(null);
    }
  }

  async function loadPaymentStatus(ride: Ride) {
    if (ride.status !== "COMPLETED") return;

    try {
      const payment = await apiRequest<Payment>(
        `/payments/rides/${ride.id}/status`
      );

      setPayments((previous) => ({
        ...previous,
        [ride.id]: payment,
      }));
    } catch (err) {
      console.error(`Could not load payment status for Ride #${ride.id}`, err);
    }
  }

  async function loadRides() {
    setError("");
    if (!user) return;

    try {
      const result = await apiRequest<Ride[]>(`/rides/rider/${user.userId}`);

      setRides(result);

      const ratingResults = await Promise.all(
        result
          .filter((ride) => ride.status === "COMPLETED")
          .map(async (ride) => {
            try {
              const status = await apiRequest<{
                rideId: number;
                rated: boolean;
              }>(`/ratings/rides/${ride.id}/status`);

              return status.rated ? ride.id : null;
            } catch (ratingError) {
              console.error(
                `Could not load rating status for Ride #${ride.id}`,
                ratingError
              );
              return null;
            }
          })
      );

      setRatedRideIds(ratingResults.filter((id): id is number => id !== null));

      // Load payment statuses only for completed rides.
      await Promise.all(
        result
          .filter((ride) => ride.status === "COMPLETED")
          .map((ride) => loadPaymentStatus(ride))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load ride history."
      );
    }
  }

  async function handleCancelRide(ride: Ride) {
    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel Ride #${ride.id}?`
    );

    if (!confirmed) return;

    setError("");
    setCancellingRideId(ride.id);

    try {
      await apiRequest<Ride>(`/rides/rider/${user.userId}/${ride.id}/cancel`, {
        method: "PUT",
      });

      await loadRides();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not cancel the ride."
      );
    } finally {
      setCancellingRideId(null);
    }
  }

  async function handleSubmitRating(ride: Ride) {
    const stars = ratingStars[ride.id];

    if (!stars || stars < 1 || stars > 5) {
      setRatingFeedback((previous) => ({
        ...previous,
        [ride.id]: "Please select a rating from 1 to 5 stars.",
      }));
      return;
    }

    setRatingSubmittingRideId(ride.id);

    setRatingFeedback((previous) => ({
      ...previous,
      [ride.id]: "",
    }));

    try {
      await apiRequest<unknown>(`/ratings/rides/${ride.id}`, {
        method: "POST",
        body: JSON.stringify({
          stars,
          comment: ratingComments[ride.id]?.trim() || null,
        }),
      });

      setRatedRideIds((previous) =>
        previous.includes(ride.id) ? previous : [...previous, ride.id]
      );

      setRatingFeedback((previous) => ({
        ...previous,
        [ride.id]: "Thank you! Your rating was submitted successfully.",
      }));
    } catch (err) {
      setRatingFeedback((previous) => ({
        ...previous,
        [ride.id]:
          err instanceof Error ? err.message : "Could not submit rating.",
      }));
    } finally {
      setRatingSubmittingRideId(null);
    }
  }

  async function loadDriverReviews(driverId: number) {
    setDriverReviewsLoading((previous) => ({
      ...previous,
      [driverId]: true,
    }));

    setDriverReviewsError((previous) => ({
      ...previous,
      [driverId]: "",
    }));

    try {
      const [summary, reviews] = await Promise.all([
        apiRequest<DriverRatingSummary>(`/ratings/drivers/${driverId}`),
        apiRequest<DriverReview[]>(`/ratings/drivers/${driverId}/reviews`),
      ]);

      setDriverRatingSummaries((previous) => ({
        ...previous,
        [driverId]: summary,
      }));

      setDriverReviews((previous) => ({
        ...previous,
        [driverId]: reviews,
      }));
    } catch (err) {
      setDriverReviewsError((previous) => ({
        ...previous,
        [driverId]:
          err instanceof Error ? err.message : "Could not load driver reviews.",
      }));
    } finally {
      setDriverReviewsLoading((previous) => ({
        ...previous,
        [driverId]: false,
      }));
    }
  }

  async function bookRide() {
    setError("");
    setMessage("");

    if (!validateForm()) return;
    setLoading(true);

    try {
      const ride = await apiRequest<Ride>("/rides", {
        method: "POST",
        body: JSON.stringify(getRequestData()),
      });

      setMessage(`Ride #${ride.id} booked successfully!`);
      setBookAnother(false);
      setFare(null);
      await loadRides();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book your ride.");
    } finally {
      setLoading(false);
    }
  }

  function useCurrentLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        setPickupLatitude(String(latitude));
        setPickupLongitude(String(longitude));
        setPickupSuggestions([]);
        setSearchQuery(null);
        setFare(null);

        try {
          setPickupAddress(await findPlaceName(latitude, longitude));
        } catch {
          setPickupAddress("Current location");
        }
      },
      () => {
        setError(
          "Could not access your location. Allow location permission and try again."
        );
      }
    );
  }

  /* ------------------------------ Logged out ----------------------------- */

  if (!user) {
    const cardClass =
      "w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-slate-900/85 p-8 shadow-2xl backdrop-blur-md";

    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-10 text-white xl:justify-end xl:pr-40">
        <LoginBackdrop />

        <div className="relative z-10 flex w-full justify-center xl:w-[28rem]">
        {/* LOGIN */}
        {!showForgotPassword && !showRegister && (
          <form onSubmit={handleLogin} className={cardClass}>
            <div className="tricolor-bar -mx-8 -mt-8 mb-2 rounded-t-2xl" />

            <h1 className="text-3xl font-bold">
              <span className="text-cyan-400">Cab</span>Connect
            </h1>

            <p className="text-sm text-slate-400">
              Log in to book and manage your rides.
            </p>

            {authSuccess && (
              <p role="status" className="text-sm text-emerald-400">
                {authSuccess}
              </p>
            )}

            <div>
              <label htmlFor="loginEmail" className="mb-2 block text-sm">
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="loginPassword" className="mb-2 block text-sm">
                Password
              </label>
              <input
                id="loginPassword"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="button"
              onClick={openForgotPassword}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              Forgot password?
            </button>

            {authError && (
              <p role="alert" className="break-words text-sm text-red-400">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className={primaryButtonClass}
            >
              {loginLoading ? "Logging in..." : "Log in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowRegister(true);
                setAuthError("");
                setAuthSuccess("");
                setRegisterError("");
              }}
              className="w-full text-sm text-cyan-400 hover:text-cyan-300"
            >
              New user? Create an account
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {showForgotPassword && (
          <div className={cardClass}>
            <h2 className="text-2xl font-bold">Reset your password</h2>

            <p className="text-sm text-slate-400">
              {resetStep === "email" &&
                "Enter your registered email to receive a verification code."}
              {resetStep === "otp" &&
                "Enter the six-digit code sent to your email."}
              {resetStep === "reset" &&
                "Choose a new password for your account."}
            </p>

            {resetStep === "email" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <label htmlFor="resetEmail" className="block text-sm">
                  Registered email
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="Enter your registered email"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className={primaryButtonClass}
                >
                  {resetLoading ? "Sending code..." : "Send verification code"}
                </button>
              </form>
            )}

            {resetStep === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <label htmlFor="resetOtp" className="block text-sm">
                  Six-digit verification code
                </label>
                <input
                  id="resetOtp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={resetOtp}
                  onChange={(e) =>
                    setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  placeholder="000000"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={resetLoading || resetOtp.length !== 6}
                  className={primaryButtonClass}
                >
                  {resetLoading ? "Verifying..." : "Verify code"}
                </button>
              </form>
            )}

            {resetStep === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <label htmlFor="newPassword" className="block text-sm">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className={inputClass}
                />

                <label htmlFor="confirmNewPassword" className="block text-sm">
                  Confirm new password
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  placeholder="Enter the new password again"
                  className={inputClass}
                />

                <button
                  type="submit"
                  disabled={resetLoading}
                  className={primaryButtonClass}
                >
                  {resetLoading ? "Resetting password..." : "Reset password"}
                </button>
              </form>
            )}

            {resetError && (
              <p role="alert" className="break-words text-sm text-red-400">
                {resetError}
              </p>
            )}

            {resetMessage && (
              <p role="status" className="break-words text-sm text-emerald-400">
                {resetMessage}
              </p>
            )}

            <button
              type="button"
              onClick={returnToLogin}
              className="w-full text-sm text-slate-400 hover:text-white"
            >
              Back to login
            </button>
          </div>
        )}

        {/* REGISTER */}
        {showRegister && !showForgotPassword && (
          <div className={cardClass}>
            <h2 className="text-2xl font-bold">Create your account</h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <input
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
                placeholder="Full name"
                className={inputClass}
              />

              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
                placeholder="Email address"
                className={inputClass}
              />

              <input
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                placeholder="Phone number"
                className={inputClass}
              />

              <input
                type="password"
                autoComplete="new-password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                minLength={8}
                required
                placeholder="Password (at least 8 characters)"
                className={inputClass}
              />

              <label
                htmlFor="registerRole"
                className="block text-sm text-slate-300"
              >
                Account type
              </label>
              <select
                id="registerRole"
                value={registerRole}
                onChange={(e) =>
                  setRegisterRole(e.target.value as "RIDER" | "DRIVER")
                }
                className={inputClass}
              >
                <option value="RIDER">Rider</option>
                <option value="DRIVER">Driver</option>
              </select>

              {registerRole === "DRIVER" && (
                <>
                  <input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                    maxLength={50}
                    placeholder="Driving license number"
                    className={inputClass}
                  />
                  <input
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Vehicle model (e.g. Maruti Swift)"
                    className={inputClass}
                  />
                  <input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                    maxLength={20}
                    placeholder="Vehicle registration number"
                    className={inputClass}
                  />
                </>
              )}

              {registerError && (
                <p role="alert" className="break-words text-sm text-red-400">
                  {registerError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className={primaryButtonClass}
              >
                {loginLoading ? "Creating account..." : "Create account"}
              </button>

              <button
                type="button"
                onClick={returnToLogin}
                className="w-full text-sm text-slate-400 hover:text-white"
              >
                Back to login
              </button>
            </form>
          </div>
        )}
        </div>
      </div>
    );
  }

  /* ----------------------------- Driver view ----------------------------- */

  if (dashboard === "driver") {
    return (
      <div>
        <div className="flex justify-end gap-2 border-b border-slate-800 bg-slate-900 px-5 py-3">
          <button
            type="button"
            onClick={() => setDashboard("rider")}
            className="rounded-lg border border-cyan-400 bg-slate-900 px-4 py-2 text-sm font-semibold text-cyan-300"
          >
            Rider dashboard
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-slate-300"
          >
            Log out
          </button>
        </div>

        <AuthenticatedDriverDashboard />
      </div>
    );
  }

  /* ----------------------------- Rider view ------------------------------ */

  const activeField = searchQuery?.field ?? null;
  const suggestions =
    activeField === "pickup"
      ? pickupSuggestions
      : activeField === "destination"
        ? destinationSuggestions
        : [];

  const selectedType =
    RIDE_TYPES.find((type) => type.id === rideType) ?? RIDE_TYPES[2];

  function selectSuggestion(
    field: "pickup" | "destination",
    location: LocationResult
  ) {
    if (field === "pickup") {
      setPickupAddress(location.display_name);
      setPickupLatitude(location.lat);
      setPickupLongitude(location.lon);
      setPickupSuggestions([]);
    } else {
      setDestinationAddress(location.display_name);
      setDestinationLatitude(location.lat);
      setDestinationLongitude(location.lon);
      setDestinationSuggestions([]);
    }

    setSearchQuery(null);
    setFare(null);
    setError("");
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950 text-white">
      {/* Full-screen map */}
      <div className="absolute inset-0 isolate">
        <RideMap
          variant="full"
          pickMode={pickMode}
          pickup={{
            lat: Number(pickupLatitude),
            lng: Number(pickupLongitude),
          }}
          destination={{
            lat: Number(destinationLatitude),
            lng: Number(destinationLongitude),
          }}
          onRouteChange={setRouteInfo}
          onPickupChange={async (position) => {
            setPickMode(null);
            setSearchQuery(null);
            setPickupSuggestions([]);
            setPickupLatitude(String(position.lat));
            setPickupLongitude(String(position.lng));
            setFare(null);
            setError("");

            try {
              setPickupAddress(await findPlaceName(position.lat, position.lng));
            } catch {
              setPickupAddress(
                `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
              );
            }
          }}
          onDestinationChange={async (position) => {
            setPickMode(null);
            setSearchQuery(null);
            setDestinationSuggestions([]);
            setDestinationLatitude(String(position.lat));
            setDestinationLongitude(String(position.lng));
            setFare(null);
            setError("");

            try {
              setDestinationAddress(
                await findPlaceName(position.lat, position.lng)
              );
            } catch {
              setDestinationAddress(
                `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
              );
            }
          }}
        />
      </div>

      {/* Floating top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30">
        <div className="tricolor-bar" />
        <div className="pointer-events-auto mx-3 mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-2.5 shadow-xl backdrop-blur lg:mx-4">
          <div>
            <p className="text-lg font-extrabold leading-tight tracking-tight">
              <span className="text-cyan-400">Cab</span>Connect
            </p>
            <p className="text-[11px] text-slate-400">
              Hi, {user.fullName.split(" ")[0]}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user.role !== "RIDER" && (
              <button
                type="button"
                onClick={() => setDashboard("driver")}
                className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300"
              >
                Driver mode
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Hint while choosing a point on the map */}
      {pickMode && (
        <div className="absolute left-1/2 top-24 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-xl lg:left-[60%]">
          Tap the map to set your{" "}
          {pickMode === "pickup" ? "pickup point" : "destination"}
          <button
            type="button"
            onClick={() => setPickMode(null)}
            className="rounded-full bg-slate-950/15 px-3 py-0.5"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bottom sheet (left panel on desktop) */}
      <section className="sheet-enter absolute inset-x-0 bottom-0 z-20 flex max-h-[82dvh] flex-col rounded-t-3xl border border-white/10 bg-slate-900 shadow-2xl lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-24 lg:max-h-none lg:w-[420px] lg:rounded-3xl">
        <div className="px-5 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-700 lg:hidden" />

          <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 text-sm font-semibold">
            {(["book", "rides"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setRiderTab(tab);
                  if (tab === "rides") void loadRides();
                }}
                className={`rounded-lg py-2 transition ${
                  riderTab === tab
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "book" ? "Book" : "My rides"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {error && (
            <p
              role="alert"
              className="mb-3 break-words rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mb-3 break-words rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"
            >
              {message}
            </p>
          )}

          {/* ------------------------------ BOOK TAB ----------------------------- */}
          {riderTab === "book" && activeRide && !bookAnother && (
            <div>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`my-6 flex h-16 w-16 items-center justify-center ${
                    activeRide.status === "REQUESTED" ? "pulse-ring" : ""
                  }`}
                >
                  <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400 text-3xl">
                    🚕
                  </span>
                </div>

                <h2 className="text-xl font-extrabold">
                  {STATUS_COPY[activeRide.status]?.title ?? "Ride in progress"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {STATUS_COPY[activeRide.status]?.sub}
                </p>
              </div>

              {activeRide.driverId !== null && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-xl">
                    👤
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {activeRide.driverName || `Driver #${activeRide.driverId}`}
                    </p>
                    {(activeRide.vehicleModel || activeRide.vehicleNumber) && (
                      <p className="text-xs text-slate-300">
                        {[activeRide.vehicleModel, activeRide.vehicleNumber]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <p className="text-xs text-yellow-300">
                      {driverRatingSummaries[activeRide.driverId]
                        ? `★ ${driverRatingSummaries[
                            activeRide.driverId
                          ].averageRating.toFixed(2)} (${
                            driverRatingSummaries[activeRide.driverId]
                              .totalRatings
                          } ratings)`
                        : "Loading rating..."}
                    </p>
                  </div>
                </div>
              )}

              {activeRide.otp &&
                ["ACCEPTED", "DRIVER_ARRIVING"].includes(activeRide.status) && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-400/40 bg-cyan-400/10 p-4">
                    <span className="text-sm text-slate-300">
                      Share this OTP with your driver
                    </span>
                    <span className="text-2xl font-extrabold tracking-widest text-cyan-300">
                      {activeRide.otp}
                    </span>
                  </div>
                )}

              {activeRide.driverPhone && (
                <a
                  href={`tel:${activeRide.driverPhone}`}
                  className="mt-3 block rounded-2xl border border-emerald-400/40 py-3 text-center font-semibold text-emerald-300 hover:bg-emerald-400/10"
                >
                  Call driver
                </a>
              )}

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center py-1">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="my-1 w-px flex-1 bg-slate-600" />
                    <span className="h-3 w-3 rounded-sm bg-cyan-400" />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <p className="break-words">{activeRide.pickupAddress}</p>
                    <p className="break-words">
                      {activeRide.destinationAddress}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between border-t border-white/10 pt-3">
                  <span className="text-slate-400">
                    Ride #{activeRide.id} · {activeRide.distanceKm} km
                  </span>
                  <span className="font-bold">
                    ₹{Number(activeRide.estimatedFare).toFixed(2)}
                  </span>
                </div>
              </div>

              {["REQUESTED", "ACCEPTED"].includes(activeRide.status) && (
                <button
                  type="button"
                  onClick={() => void handleCancelRide(activeRide)}
                  disabled={cancellingRideId === activeRide.id}
                  className="mt-4 w-full rounded-2xl border border-red-500/50 py-3 font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {cancellingRideId === activeRide.id
                    ? "Cancelling..."
                    : "Cancel ride"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setBookAnother(true)}
                className="mt-3 w-full rounded-2xl border border-cyan-400/50 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Book another ride
              </button>
            </div>
          )}

          {riderTab === "book" && (!activeRide || bookAnother) && !fare && (
            <div>
              {activeRide && (
                <button
                  type="button"
                  onClick={() => setBookAnother(false)}
                  className="mb-3 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  ← Back to current ride
                </button>
              )}
              <h1 className="text-2xl font-extrabold">Where to?</h1>
              <p className="mt-1 text-sm text-slate-400">
                Choose a pickup point and a destination.
              </p>

              <div className="mt-4 flex gap-3 rounded-2xl border border-white/10 bg-slate-950 p-3">
                <div className="flex flex-col items-center py-4">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="my-1 w-px flex-1 bg-slate-600" />
                  <span className="h-3 w-3 rounded-sm bg-cyan-400" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="pickup"
                      aria-label="Pickup location"
                      value={pickupAddress}
                      onChange={(e) => {
                        setPickupAddress(e.target.value);
                        setDestinationSuggestions([]);
                        setFare(null);
                        setSearchQuery({
                          field: "pickup",
                          text: e.target.value,
                        });
                      }}
                      placeholder="Pickup location"
                      className="min-w-0 flex-1 truncate rounded-xl bg-slate-800 px-3 py-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      aria-label="Use my current location"
                      title="Use my current location"
                      className="rounded-xl bg-slate-800 px-3 py-3 text-sm hover:bg-slate-700"
                    >
                      📍
                    </button>
                  </div>

                  <input
                    id="destination"
                    aria-label="Destination"
                    value={destinationAddress}
                    onChange={(e) => {
                      setDestinationAddress(e.target.value);
                      setPickupSuggestions([]);
                      setFare(null);
                      setSearchQuery({
                        field: "destination",
                        text: e.target.value,
                      });
                    }}
                    placeholder="Where are you going?"
                    className="w-full truncate rounded-xl bg-slate-800 px-3 py-3 text-sm outline-none ring-1 ring-transparent transition focus:ring-cyan-400"
                  />
                </div>
              </div>

              {(locationSearchLoading || suggestions.length > 0) && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                  {locationSearchLoading && (
                    <p className="px-4 py-3 text-sm text-cyan-300">
                      Searching places...
                    </p>
                  )}

                  {activeField &&
                    suggestions.map((location) => {
                      const [title, ...rest] = location.display_name.split(", ");

                      return (
                        <button
                          key={location.place_id}
                          type="button"
                          onClick={() => selectSuggestion(activeField, location)}
                          className="flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-slate-800"
                        >
                          <span className="mt-0.5 text-slate-500">📍</span>
                          <span className="min-w-0 text-sm">
                            <span className="block truncate font-semibold">
                              {title}
                            </span>
                            <span className="block truncate text-xs text-slate-400">
                              {rest.join(", ")}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setPickMode("pickup")}
                  className="rounded-full border border-emerald-400/40 px-4 py-2 text-emerald-300 hover:bg-emerald-400/10"
                >
                  Set pickup on map
                </button>
                <button
                  type="button"
                  onClick={() => setPickMode("destination")}
                  className="rounded-full border border-cyan-400/40 px-4 py-2 text-cyan-300 hover:bg-cyan-400/10"
                >
                  Set destination on map
                </button>
              </div>

              <button
                type="button"
                onClick={() => void estimateFare()}
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-cyan-400 py-4 text-base font-bold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                {loading ? "Finding rides..." : "See ride options"}
              </button>
            </div>
          )}

          {riderTab === "book" && (!activeRide || bookAnother) && fare && (
            <div>
              <button
                type="button"
                onClick={() => setFare(null)}
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                ← Edit trip
              </button>

              <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm">
                <p className="truncate">{pickupAddress}</p>
                <p className="my-1 text-xs text-slate-500">to</p>
                <p className="truncate">{destinationAddress}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {fare.distanceKm} km
                  {routeInfo
                    ? `, about ${Math.max(
                        1,
                        Math.ceil(routeInfo.durationMinutes)
                      )} min`
                    : ""}
                </p>
              </div>

              <h2 className="mt-5 text-lg font-bold">Choose a ride</h2>

              <div className="mt-3 space-y-2">
                {RIDE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setRideType(type.id)}
                    aria-pressed={rideType === type.id}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition ${
                      rideType === type.id
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-white/10 bg-slate-950 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-3xl">{type.icon}</span>
                    <span className="flex-1">
                      <span className="block font-semibold">{type.name}</span>
                      <span className="block text-xs text-slate-400">
                        {type.seats} {type.seats === 1 ? "seat" : "seats"},{" "}
                        {type.blurb}
                      </span>
                    </span>
                    <span className="font-bold">
                      ₹{(Number(fare.estimatedFare) * type.factor).toFixed(0)}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void bookRide()}
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {loading
                  ? "Booking..."
                  : `Book ${selectedType.name} · ₹${(
                      Number(fare.estimatedFare) * selectedType.factor
                    ).toFixed(0)}`}
              </button>
            </div>
          )}

          {/* ------------------------------ RIDES TAB ---------------------------- */}
          {riderTab === "rides" && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold">Your rides</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Recent bookings and their status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadRides()}
                  className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-cyan-400"
                >
                  Refresh
                </button>
              </div>

              {paymentError && (
                <p
                  role="alert"
                  className="mt-4 break-words rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
                >
                  {paymentError}
                </p>
              )}
              {paymentMessage && (
                <p
                  role="status"
                  className="mt-4 break-words rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"
                >
                  {paymentMessage}
                </p>
              )}

              <div className="mt-5 space-y-3">
                {rides.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                    Your ride history will appear here.
                    <br />
                    Tap Refresh to load existing rides.
                  </p>
                ) : (
                  rides.map((ride) => (
                    <div
                      key={ride.id}
                      className="rounded-xl border border-white/10 bg-slate-950 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">Ride #{ride.id}</span>
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                          {ride.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-300">
                        {ride.pickupAddress}
                      </p>
                      <p className="my-1 text-xs text-slate-500">↓ Destination</p>
                      <p className="text-sm text-slate-300">
                        {ride.destinationAddress}
                      </p>

                      {ride.driverId !== null && ride.status === "COMPLETED" && (
                        <div className="mt-4 rounded-lg border border-white/10 bg-slate-900 p-3">
                          <button
                            type="button"
                            onClick={() => void loadDriverReviews(ride.driverId!)}
                            disabled={driverReviewsLoading[ride.driverId]}
                            className="w-full rounded-lg border border-cyan-400/50 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-50"
                          >
                            {driverReviewsLoading[ride.driverId]
                              ? "Loading driver reviews..."
                              : "View driver ratings & reviews"}
                          </button>

                          {driverReviewsError[ride.driverId] && (
                            <p role="alert" className="mt-2 text-sm text-red-300">
                              {driverReviewsError[ride.driverId]}
                            </p>
                          )}

                          {driverRatingSummaries[ride.driverId] && (
                            <div className="mt-3">
                              <p className="font-semibold text-yellow-300">
                                ★{" "}
                                {driverRatingSummaries[
                                  ride.driverId
                                ].averageRating.toFixed(2)}{" "}
                                / 5
                              </p>
                              <p className="text-xs text-slate-400">
                                {driverRatingSummaries[ride.driverId].totalRatings}{" "}
                                ratings
                              </p>
                            </div>
                          )}

                          {driverReviews[ride.driverId] && (
                            <div className="mt-3 space-y-3">
                              {driverReviews[ride.driverId].length === 0 ? (
                                <p className="text-sm text-slate-400">
                                  This driver has no written reviews yet.
                                </p>
                              ) : (
                                driverReviews[ride.driverId].map((review) => (
                                  <div
                                    key={review.id}
                                    className="border-t border-white/10 pt-3"
                                  >
                                    <p className="text-sm text-yellow-300">
                                      {"★".repeat(review.stars)}
                                      {"☆".repeat(5 - review.stars)}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-300">
                                      {review.comment || "No written comment."}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {new Date(
                                        review.createdAt
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-sm">
                        <span className="text-slate-400">
                          {ride.distanceKm} km
                        </span>
                        <span className="font-semibold">
                          ₹{Number(ride.estimatedFare).toFixed(2)}
                        </span>
                      </div>

                      {ride.status === "COMPLETED" &&
                        (payments[ride.id]?.status === "SUCCESS" ? (
                          <p className="mt-3 text-center text-sm font-semibold text-emerald-300">
                            ✓ Paid ₹{Number(payments[ride.id].amount).toFixed(2)}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleMockPayment(ride)}
                            disabled={payingRideId !== null}
                            className="mt-3 w-full rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50"
                          >
                            {payingRideId === ride.id
                              ? "Processing..."
                              : "Pay (mock)"}
                          </button>
                        ))}

                      {["REQUESTED", "ACCEPTED"].includes(ride.status) && (
                        <button
                          type="button"
                          onClick={() => void handleCancelRide(ride)}
                          disabled={cancellingRideId === ride.id}
                          className="mt-3 w-full rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingRideId === ride.id
                            ? "Cancelling..."
                            : "Cancel ride"}
                        </button>
                      )}

                      {ride.status === "COMPLETED" && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          {ratedRideIds.includes(ride.id) ? (
                            <p className="text-sm font-semibold text-emerald-300">
                              ✓ Thank you for rating this ride!
                            </p>
                          ) : (
                            <>
                              <h3 className="font-semibold text-white">
                                Rate your driver
                              </h3>

                              <p className="mt-1 text-sm text-slate-400">
                                How was your ride?
                              </p>

                              <div
                                className="mt-3 flex gap-2"
                                role="group"
                                aria-label="Choose a star rating"
                              >
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                      setRatingStars((previous) => ({
                                        ...previous,
                                        [ride.id]: star,
                                      }))
                                    }
                                    aria-label={`${star} star${
                                      star === 1 ? "" : "s"
                                    }`}
                                    aria-pressed={ratingStars[ride.id] === star}
                                    className={`text-3xl ${
                                      star <= (ratingStars[ride.id] ?? 0)
                                        ? "text-yellow-400"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>

                              <textarea
                                value={ratingComments[ride.id] ?? ""}
                                onChange={(event) =>
                                  setRatingComments((previous) => ({
                                    ...previous,
                                    [ride.id]: event.target.value.slice(0, 500),
                                  }))
                                }
                                maxLength={500}
                                rows={3}
                                placeholder="Leave an optional comment..."
                                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white placeholder:text-slate-500"
                              />

                              <button
                                type="button"
                                onClick={() => void handleSubmitRating(ride)}
                                disabled={
                                  !ratingStars[ride.id] ||
                                  ratingSubmittingRideId === ride.id
                                }
                                className="mt-3 w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {ratingSubmittingRideId === ride.id
                                  ? "Submitting rating..."
                                  : "Submit rating"}
                              </button>

                              {ratingFeedback[ride.id] && (
                                <p
                                  role="status"
                                  className="mt-3 text-sm text-cyan-300"
                                >
                                  {ratingFeedback[ride.id]}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
