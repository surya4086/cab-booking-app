import { useCallback, useEffect, useState } from "react";
import RideMap from "./RideMap";

const API_BASE = "http://localhost:8080/api";

type Ride = {
  id: number;
  riderId: number;
  riderName: string;
  riderPhone: string | null;
  driverId: number | null;
  pickupAddress: string;
  destinationAddress: string;
  // Coordinates for displaying the ride on the map
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;

  distanceKm: number;
  estimatedFare: number;
  status: string;
  createdAt: string;
};

type Coordinates = { lat: number; lng: number };

type RideAction = "accept" | "reject" | "arriving" | "start" | "complete";

const ACTIVE_STATUSES = ["ACCEPTED", "DRIVER_ARRIVING", "IN_PROGRESS"];

const STEPS = [
  { status: "ACCEPTED", label: "Accepted" },
  { status: "DRIVER_ARRIVING", label: "Arriving" },
  { status: "IN_PROGRESS", label: "On trip" },
  { status: "COMPLETED", label: "Done" },
];

async function apiRequest<T>(path: string, method = "GET"): Promise<T> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function formatFare(fare: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(fare);
}

function statusStyle(status: string) {
  switch (status) {
    case "REQUESTED":
      return "bg-cyan-400/10 text-cyan-300";
    case "ACCEPTED":
    case "DRIVER_ARRIVING":
      return "bg-amber-400/10 text-amber-300";
    case "IN_PROGRESS":
      return "bg-blue-400/10 text-blue-300";
    case "COMPLETED":
      return "bg-emerald-400/10 text-emerald-300";
    case "CANCELLED":
    case "REJECTED":
      return "bg-red-400/10 text-red-300";
    default:
      return "bg-slate-700 text-slate-200";
  }
}

// Straight-line distance in metres between two points.
function distanceMeters(a: Coordinates, b: Coordinates) {
  const radius = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(h));
}

// Follows the driver's device location. Updates are throttled (at least 40 m
// moved and 8 s apart) so the public routing service is not flooded.
function useDriverLocation(enabled: boolean) {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      setError("This browser does not support location.");
      return;
    }

    let last: (Coordinates & { time: number }) | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (result) => {
        const next = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        };
        const now = Date.now();

        if (last) {
          if (distanceMeters(last, next) < 40 || now - last.time < 8000) {
            return;
          }
        }

        last = { ...next, time: now };
        setPosition(next);
        setError("");
      },
      () => {
        setError("Location is unavailable. Allow location access in the browser.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { position, error };
}

function RideCard({
  ride,
  available,
  busy,
  onAction,
  onViewMap,
}: {
  ride: Ride;
  available: boolean;
  busy: boolean;
  onAction: (rideId: number, action: RideAction) => void;
  onViewMap?: (ride: Ride) => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-white">Ride #{ride.id}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
            ride.status
          )}`}
        >
          {ride.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">RIDER</p>
          <p className="mt-1 text-slate-100">
            {ride.riderName || `Rider #${ride.riderId}`}
          </p>

          <p className="mt-2 text-xs text-slate-400">PHONE NUMBER</p>

          {ride.riderPhone ? (
            <a
              href={`tel:${ride.riderPhone}`}
              className="mt-1 inline-block font-semibold text-cyan-300 hover:underline"
            >
              {ride.riderPhone}
            </a>
          ) : (
            <p className="mt-1 text-slate-400">Phone number unavailable</p>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center py-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="my-1 w-px flex-1 bg-slate-600" />
            <span className="h-3 w-3 rounded-sm bg-cyan-400" />
          </div>
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-xs text-slate-400">PICKUP</p>
              <p className="mt-1 break-words text-slate-100">
                {ride.pickupAddress}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">DESTINATION</p>
              <p className="mt-1 break-words text-slate-100">
                {ride.destinationAddress}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-3">
        <span className="text-sm text-slate-400">
          {ride.distanceKm.toFixed(2)} km
        </span>
        <span className="text-lg font-bold text-cyan-300">
          {formatFare(ride.estimatedFare)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onViewMap && (
          <button
            type="button"
            onClick={() => onViewMap(ride)}
            className="w-full rounded-xl border border-cyan-400/50 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10"
          >
            View route on map
          </button>
        )}

        {available && (
          <>
            <button
              disabled={busy}
              onClick={() => onAction(ride.id, "accept")}
              className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? "Please wait..." : "Accept ride"}
            </button>

            <button
              disabled={busy}
              onClick={() => onAction(ride.id, "reject")}
              className="rounded-xl border border-red-500/50 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              Decline
            </button>
          </>
        )}

        {!available && ride.status === "ACCEPTED" && (
          <button
            disabled={busy}
            onClick={() => onAction(ride.id, "arriving")}
            className="w-full rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            Mark as arriving
          </button>
        )}

        {!available && ride.status === "DRIVER_ARRIVING" && (
          <button
            disabled={busy}
            onClick={() => onAction(ride.id, "start")}
            className="w-full rounded-xl bg-cyan-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            Start ride
          </button>
        )}

        {!available && ride.status === "IN_PROGRESS" && (
          <button
            disabled={busy}
            onClick={() => onAction(ride.id, "complete")}
            className="w-full rounded-xl bg-emerald-500 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            Complete ride
          </button>
        )}

        {busy && (
          <p className="w-full text-xs text-slate-400">Processing request...</p>
        )}
      </div>
    </article>
  );
}

export default function DriverDashboard({ DRIVER_ID }: { DRIVER_ID: number }) {
  const [requests, setRequests] = useState<Ride[]>([]);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyRideId, setBusyRideId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  // UI-only: hides new requests while offline (no backend endpoint for this yet).
  const [online, setOnline] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const [available, assigned] = await Promise.all([
          apiRequest<Ride[]>(`/drivers/${DRIVER_ID}/available-rides`),
          apiRequest<Ride[]>(`/drivers/${DRIVER_ID}/rides`),
        ]);

        setRequests(available);
        setMyRides(assigned);
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load driver dashboard."
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [DRIVER_ID]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Quietly refresh every 10 seconds so new requests and status changes appear.
  useEffect(() => {
    const timer = window.setInterval(() => void loadDashboard(true), 10000);
    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  async function performAction(rideId: number, action: RideAction) {
    setBusyRideId(rideId);
    setError("");
    setMessage("");

    const methods = {
      accept: "POST",
      reject: "POST",
      arriving: "PUT",
      start: "PUT",
      complete: "PUT",
    } as const;

    const paths = {
      accept: `/drivers/${DRIVER_ID}/rides/${rideId}/accept`,
      reject: `/drivers/${DRIVER_ID}/rides/${rideId}/reject`,
      arriving: `/drivers/${DRIVER_ID}/rides/${rideId}/arriving`,
      start: `/drivers/${DRIVER_ID}/rides/${rideId}/start`,
      complete: `/drivers/${DRIVER_ID}/rides/${rideId}/complete`,
    } as const;

    try {
      await apiRequest<Ride | undefined>(paths[action], methods[action]);

      const messages = {
        accept: `Ride #${rideId} accepted.`,
        reject: `Ride #${rideId} declined.`,
        arriving: `Ride #${rideId}: driver arriving.`,
        start: `Ride #${rideId} started.`,
        complete: `Ride #${rideId} completed.`,
      };

      setMessage(messages[action]);

      if (action === "reject") {
        // Remove the rejected ride immediately from the available list.
        setRequests((previous) => previous.filter((ride) => ride.id !== rideId));
      }

      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The ride action failed.");
    } finally {
      setBusyRideId(null);
    }
  }

  const activeRides = myRides.filter((ride) =>
    ACTIVE_STATUSES.includes(ride.status)
  );

  // The ride the driver is working on stays here until it is completed.
  const currentRide =
    [...activeRides].sort((a, b) => a.id - b.id)[0] ?? null;

  const historyRides = myRides
    .filter((ride) => ride.id !== currentRide?.id)
    .sort((a, b) => b.id - a.id);

  const { position: driverPosition, error: locationError } = useDriverLocation(
    currentRide !== null
  );

  // Completed rides created today (the API has no completion timestamp).
  const todaysEarnings = myRides
    .filter(
      (ride) =>
        ride.status === "COMPLETED" &&
        new Date(ride.createdAt).toDateString() === new Date().toDateString()
    )
    .reduce((sum, ride) => sum + Number(ride.estimatedFare), 0);

  const pickupPoint: Coordinates | null = currentRide
    ? { lat: currentRide.pickupLatitude, lng: currentRide.pickupLongitude }
    : null;
  const destinationPoint: Coordinates | null = currentRide
    ? {
        lat: currentRide.destinationLatitude,
        lng: currentRide.destinationLongitude,
      }
    : null;

  const headingToDestination = currentRide?.status === "IN_PROGRESS";
  const stepIndex = currentRide
    ? STEPS.findIndex((step) => step.status === currentRide.status)
    : -1;

  const nextAction: { action: RideAction; label: string } | null =
    currentRide?.status === "ACCEPTED"
      ? { action: "arriving", label: "I'm arriving at pickup" }
      : currentRide?.status === "DRIVER_ARRIVING"
        ? { action: "start", label: "Start ride" }
        : currentRide?.status === "IN_PROGRESS"
          ? { action: "complete", label: "Complete ride" }
          : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="tricolor-bar" />
      <header className="border-b border-slate-800 bg-slate-900 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">
              <span className="text-cyan-400">Cab</span>Connect
            </h1>
            <p className="mt-1 text-sm text-slate-400">Driver dashboard</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnline((value) => !value)}
              aria-pressed={online}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                online
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  online ? "bg-slate-950" : "bg-slate-500"
                }`}
              />
              {online ? "Online" : "Offline"}
            </button>

            <button
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm hover:border-cyan-400 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Today's earnings</p>
            <p className="mt-2 text-2xl font-extrabold text-cyan-300 sm:text-3xl">
              {formatFare(todaysEarnings)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Available requests</p>
            <p className="mt-2 text-3xl font-extrabold text-cyan-300">
              {online ? requests.length : 0}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active rides</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-300">
              {activeRides.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Completed rides</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-300">
              {myRides.filter((ride) => ride.status === "COMPLETED").length}
            </p>
          </div>
        </section>

        {message && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {/* ------------------------ Available requests (highlighted) ------------------------ */}
        <section className="rounded-3xl border-2 border-cyan-400/60 bg-gradient-to-br from-cyan-400/10 via-slate-900 to-slate-900 p-5 shadow-[0_0_40px_-12px_rgba(255,153,51,0.5)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-3 text-2xl font-extrabold">
                Available ride requests
                {online && requests.length > 0 && (
                  <span className="relative flex h-7 min-w-[1.75rem] items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative rounded-full bg-cyan-400 px-2 text-sm font-bold text-slate-950">
                      {requests.length}
                    </span>
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                New requests appear here automatically. Accept one to start.
              </p>
            </div>
          </div>

          {!online ? (
            <div className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">
              You're offline. Go online to see new ride requests.
            </div>
          ) : loading ? (
            <p className="text-slate-400">Loading ride requests...</p>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 p-8 text-center text-slate-400">
              No available ride requests right now.
              <p className="mt-1 text-xs">We check for new ones every 10 seconds.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {requests.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  available
                  busy={busyRideId === ride.id}
                  onAction={(id, action) => void performAction(id, action)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------ Current ride ------------------------------ */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold">Current ride</h2>
            {currentRide && driverPosition && (
              <span className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Live location on
              </span>
            )}
          </div>

          {currentRide && pickupPoint && destinationPoint ? (
            <div className="overflow-hidden rounded-3xl border border-emerald-400/40 bg-slate-900">
              <div className="border-b border-white/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-extrabold">
                    Ride #{currentRide.id}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                      currentRide.status
                    )}`}
                  >
                    {currentRide.status.replaceAll("_", " ")}
                  </span>
                </div>

                <ol className="mt-4 grid grid-cols-4 gap-2">
                  {STEPS.map((step, index) => (
                    <li
                      key={step.status}
                      className="flex flex-col items-center gap-2 text-center text-xs"
                    >
                      <span
                        className={`h-2 w-full rounded-full ${
                          index <= stepIndex ? "bg-cyan-400" : "bg-slate-700"
                        }`}
                      />
                      <span
                        className={
                          index <= stepIndex
                            ? "font-semibold text-white"
                            : "text-slate-500"
                        }
                      >
                        {step.label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid lg:grid-cols-[380px_1fr]">
                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-xs text-slate-400">RIDER</p>
                    <p className="mt-1 font-semibold">
                      {currentRide.riderName || `Rider #${currentRide.riderId}`}
                    </p>
                    {currentRide.riderPhone ? (
                      <a
                        href={`tel:${currentRide.riderPhone}`}
                        className="mt-2 inline-block rounded-xl border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10"
                      >
                        Call {currentRide.riderPhone}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">
                        Phone number unavailable
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 rounded-2xl bg-slate-950 p-4 text-sm">
                    <div className="flex flex-col items-center py-1">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="my-1 w-px flex-1 bg-slate-600" />
                      <span className="h-3 w-3 rounded-sm bg-cyan-400" />
                    </div>
                    <div className="min-w-0 space-y-3">
                      <p className="break-words">{currentRide.pickupAddress}</p>
                      <p className="break-words">
                        {currentRide.destinationAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      {currentRide.distanceKm.toFixed(2)} km
                    </span>
                    <span className="text-xl font-extrabold text-cyan-300">
                      {formatFare(currentRide.estimatedFare)}
                    </span>
                  </div>

                  {nextAction && (
                    <button
                      type="button"
                      disabled={busyRideId === currentRide.id}
                      onClick={() =>
                        void performAction(currentRide.id, nextAction.action)
                      }
                      className={`w-full rounded-2xl py-4 text-base font-bold disabled:opacity-50 ${
                        nextAction.action === "complete"
                          ? "bg-emerald-500 text-white hover:bg-emerald-400"
                          : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                      }`}
                    >
                      {busyRideId === currentRide.id
                        ? "Please wait..."
                        : nextAction.label}
                    </button>
                  )}
                </div>

                <div className="p-3 lg:p-5 lg:pl-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm">
                    <span className="font-semibold">
                      {driverPosition
                        ? headingToDestination
                          ? "Driving to destination"
                          : "Driving to pickup"
                        : "Trip route"}
                    </span>
                    <span className="text-slate-300">
                      {routeInfo
                        ? `${routeInfo.distanceKm.toFixed(1)} km · about ${Math.max(
                            1,
                            Math.ceil(routeInfo.durationMinutes)
                          )} min`
                        : "Calculating route..."}
                    </span>
                  </div>

                  {locationError && (
                    <p className="mb-3 text-xs text-amber-300">
                      {locationError} Showing the full trip route instead.
                    </p>
                  )}

                  <RideMap
                    key={currentRide.id}
                    pickup={pickupPoint}
                    destination={destinationPoint}
                    driver={driverPosition}
                    routeFrom={driverPosition ?? undefined}
                    routeTo={
                      driverPosition
                        ? headingToDestination
                          ? destinationPoint
                          : pickupPoint
                        : undefined
                    }
                    onRouteChange={setRouteInfo}
                    onPickupChange={() => {}}
                    onDestinationChange={() => {}}
                    readOnly
                    showStats={false}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No active ride. Accept a request above to start navigating.
            </div>
          )}
        </section>

        {/* ----------------------------- Ride history (collapsible) ----------------------------- */}
        <section>
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-left transition hover:border-cyan-400"
          >
            <span>
              <span className="block text-xl font-bold">My rides history</span>
              <span className="block text-sm text-slate-400">
                {historyRides.length}{" "}
                {historyRides.length === 1 ? "ride" : "rides"} · tap to{" "}
                {historyOpen ? "hide" : "view"}
              </span>
            </span>
            <span
              className={`text-2xl text-cyan-300 transition-transform ${
                historyOpen ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {historyOpen && (
            <div className="mt-4">
              {loading ? (
                <p className="text-slate-400">Loading your rides...</p>
              ) : historyRides.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
                  No past rides yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {historyRides.map((ride) => (
                    <RideCard
                      key={ride.id}
                      ride={ride}
                      available={false}
                      busy={busyRideId === ride.id}
                      onAction={(id, action) => void performAction(id, action)}
                      onViewMap={setSelectedRide}
                    />
                  ))}
                </div>
              )}

              {selectedRide && (
                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <h2 className="mb-4 text-xl font-semibold">
                    Ride #{selectedRide.id} route
                  </h2>

                  <RideMap
                    key={selectedRide.id}
                    pickup={{
                      lat: selectedRide.pickupLatitude,
                      lng: selectedRide.pickupLongitude,
                    }}
                    destination={{
                      lat: selectedRide.destinationLatitude,
                      lng: selectedRide.destinationLongitude,
                    }}
                    onPickupChange={() => {}}
                    onDestinationChange={() => {}}
                    readOnly
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedRide(null)}
                    className="mt-4 rounded-xl bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
                  >
                    Close map
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
