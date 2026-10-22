import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

type Coordinates = {
  lat: number;
  lng: number;
};

type RouteInfo = {
  distanceKm: number;
  durationMinutes: number;
};

type PickMode = "pickup" | "destination";

type RideMapProps = {
  pickup: Coordinates;
  destination: Coordinates;
  onPickupChange: (position: Coordinates) => void;
  onDestinationChange: (position: Coordinates) => void;
  /** "card" = boxed map (driver dashboard). "full" = fills its parent (rider home). */
  variant?: "card" | "full";
  /** Hides the pick buttons and disables dragging / tapping to move pins. */
  readOnly?: boolean;
  /** Full variant only: which pin the next map tap moves (null = none). */
  pickMode?: PickMode | null;
  /** Reports the driving distance / time whenever the route changes. */
  onRouteChange?: (route: RouteInfo | null) => void;
  /** Shows a car marker, e.g. the driver's live position. */
  driver?: Coordinates | null;
  /** Override where the route starts / ends (defaults to pickup / destination). */
  routeFrom?: Coordinates;
  routeTo?: Coordinates;
  /** Card variant only: show the distance / time panel (default true). */
  showStats?: boolean;
};

type RouteResult = RouteInfo & {
  coordinates: Coordinates[];
};

const isValid = (point: Coordinates | undefined) =>
  Number.isFinite(point?.lat) && Number.isFinite(point?.lng);

const pickupIcon = L.divIcon({
  className: "",
  html: '<div class="pin pin-pickup"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const destinationIcon = L.divIcon({
  className: "",
  html: '<div class="pin pin-drop"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const driverIcon = L.divIcon({
  className: "",
  html: '<div class="pin-car">🚕</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function MapClickHandler({
  mode,
  onPickupChange,
  onDestinationChange,
}: {
  mode: PickMode | null;
  onPickupChange: (position: Coordinates) => void;
  onDestinationChange: (position: Coordinates) => void;
}) {
  useMapEvents({
    click(event) {
      if (!mode) return;

      const position = { lat: event.latlng.lat, lng: event.latlng.lng };

      if (mode === "pickup") {
        onPickupChange(position);
      } else {
        onDestinationChange(position);
      }
    },
  });

  return null;
}

function FitRoute({
  pickup,
  destination,
  route,
  variant,
}: {
  pickup: Coordinates;
  destination: Coordinates;
  route: Coordinates[];
  variant: "card" | "full";
}) {
  const map = useMap();

  useEffect(() => {
    if (!isValid(pickup) || !isValid(destination)) return;

    const points =
      route.length > 0
        ? route.map((point) => [point.lat, point.lng] as [number, number])
        : [
            [pickup.lat, pickup.lng] as [number, number],
            [destination.lat, destination.lng] as [number, number],
          ];

    const bounds = L.latLngBounds(points);

    const fit = () => {
      // Leaflet caches the container size; refresh it before measuring.
      map.invalidateSize();
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) return;

      if (variant === "full") {
        // Keep the route clear of the floating UI: the sheet is on the left on
        // desktop and at the bottom on phones. Never let padding swallow the map.
        const desktop = size.x >= 1024;
        const left = Math.min(desktop ? 460 : 40, size.x * 0.5);
        const bottom = Math.min(desktop ? 40 : 420, size.y * 0.55);
        const top = Math.min(110, size.y * 0.25);

        map.fitBounds(bounds, {
          paddingTopLeft: [left, top],
          paddingBottomRight: [40, bottom],
          maxZoom: 17,
          animate: false,
        });
      } else {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17, animate: false });
      }
    };

    fit();

    // Re-measure and re-fit whenever the map container changes size.
    const observer = new ResizeObserver(() => fit());
    observer.observe(map.getContainer());

    return () => observer.disconnect();
  }, [
    map,
    variant,
    pickup.lat,
    pickup.lng,
    destination.lat,
    destination.lng,
    route,
  ]);

  return null;
}

export default function RideMap({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  variant = "card",
  readOnly = false,
  pickMode = null,
  onRouteChange,
  driver = null,
  routeFrom,
  routeTo,
  showStats = true,
}: RideMapProps) {
  const [internalMode, setInternalMode] = useState<PickMode>("pickup");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  // Keep the latest callback without re-running the route request.
  const routeCallback = useRef(onRouteChange);
  useEffect(() => {
    routeCallback.current = onRouteChange;
  }, [onRouteChange]);

  const mode: PickMode | null = readOnly
    ? null
    : variant === "full"
      ? pickMode
      : internalMode;

  const origin = routeFrom ?? pickup;
  const target = routeTo ?? destination;

  useEffect(() => {
    if (!isValid(origin) || !isValid(target)) {
      setRoute(null);
      routeCallback.current?.(null);
      return;
    }

    const controller = new AbortController();

    async function loadRoute() {
      setRoute(null);
      setRouteError("");
      setRouteLoading(true);
      routeCallback.current?.(null);

      try {
        const url =
          "https://router.project-osrm.org/route/v1/driving/" +
          `${origin.lng},${origin.lat};${target.lng},${target.lat}` +
          "?overview=full&geometries=geojson";

        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("Routing service is temporarily unavailable.");
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes?.length) {
          throw new Error(
            "No driving route found. Try selecting different locations."
          );
        }

        const result = data.routes[0];

        const coordinates: Coordinates[] = result.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => ({ lat, lng })
        );

        const info: RouteInfo = {
          distanceKm: result.distance / 1000,
          durationMinutes: result.duration / 60,
        };

        setRoute({ coordinates, ...info });
        routeCallback.current?.(info);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setRouteError(
          error instanceof Error
            ? error.message
            : "Could not calculate the driving route."
        );
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      }
    }

    void loadRoute();

    return () => controller.abort();
  }, [origin.lat, origin.lng, target.lat, target.lng]);

  const routeCoordinates = useMemo(() => route?.coordinates ?? [], [route]);
  const routePositions = useMemo(
    () =>
      routeCoordinates.map((point) => [point.lat, point.lng] as [number, number]),
    [routeCoordinates]
  );

  const map = (
    <MapContainer
      center={isValid(pickup) ? [pickup.lat, pickup.lng] : [29.8543, 77.888]}
      zoom={13}
      scrollWheelZoom
      zoomControl={variant !== "full"}
      className={
        variant === "full" ? "h-full w-full" : "h-[400px] w-full"
      }
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
        maxZoom={19}
      />

      {variant === "full" && <ZoomControl position="bottomright" />}

      <MapClickHandler
        mode={mode}
        onPickupChange={onPickupChange}
        onDestinationChange={onDestinationChange}
      />

      <FitRoute
        pickup={origin}
        destination={target}
        route={routeCoordinates}
        variant={variant}
      />

      {routePositions.length > 0 && (
        <>
          {/* Dark casing under the route so it stands out on any tile */}
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#000000", weight: 9, opacity: 0.45 }}
          />
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#ff9933", weight: 5 }}
          />
        </>
      )}

      {isValid(pickup) && (
        <Marker
          position={[pickup.lat, pickup.lng]}
          icon={pickupIcon}
          draggable={!readOnly}
          eventHandlers={{
            dragend(event) {
              const point = (event.target as L.Marker).getLatLng();
              onPickupChange({ lat: point.lat, lng: point.lng });
            },
          }}
        >
          <Popup>Pickup</Popup>
        </Marker>
      )}

      {isValid(destination) && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={destinationIcon}
          draggable={!readOnly}
          eventHandlers={{
            dragend(event) {
              const point = (event.target as L.Marker).getLatLng();
              onDestinationChange({ lat: point.lat, lng: point.lng });
            },
          }}
        >
          <Popup>Destination</Popup>
        </Marker>
      )}
      {driver && isValid(driver) && (
        <Marker
          position={[driver.lat, driver.lng]}
          icon={driverIcon}
          zIndexOffset={1000}
        >
          <Popup>Your location</Popup>
        </Marker>
      )}
    </MapContainer>
  );

  if (variant === "full") {
    return <div className="h-full w-full">{map}</div>;
  }

  return (
    <div className="w-full space-y-3">
      {!readOnly && (
        <>
          <div className="flex flex-wrap gap-2">
            {(["pickup", "destination"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setInternalMode(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  internalMode === option
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {option === "pickup" ? "Set pickup" : "Set destination"}
              </button>
            ))}
          </div>

          <p className="text-sm text-slate-400">
            Tap the map to set your{" "}
            {internalMode === "pickup" ? "pickup point" : "destination"}, or
            drag a pin.
          </p>
        </>
      )}

      <div className="isolate overflow-hidden rounded-2xl border border-white/10">
        {map}
      </div>

      {routeLoading && (
        <p className="text-sm text-cyan-300">Calculating driving route...</p>
      )}

      {routeError && (
        <p role="alert" className="text-sm text-red-400">
          {routeError}
        </p>
      )}

      {route && showStats && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-slate-950 p-3">
          <div>
            <p className="text-sm text-slate-400">Road distance</p>
            <p className="font-semibold text-white">
              {route.distanceKm.toFixed(2)} km
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-400">Estimated travel time</p>
            <p className="font-semibold text-white">
              {Math.max(1, Math.ceil(route.durationMinutes))} min
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
