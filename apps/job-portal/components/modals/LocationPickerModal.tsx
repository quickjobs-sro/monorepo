"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import API, { type AreaInput } from "../../lib/legacyApi";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Button } from "@ui/components/core/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@ui/components/core/dialog";
import { useToast } from "@ui/hooks/use-toast";
import { API_KEYS } from "@ui/types/api_keys";
import { Loader2, MapPin } from "lucide-react";
import "./LocationPickerModal.css";

type SelectedLocation = {
    latitude: number;
    longitude: number;
    address: string;
    radius?: number;
};

interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLocation?: SelectedLocation;
    initialRadius?: number;
    areaId?: number;
    onSuccess?: () => void;
}

const DEFAULT_LOCATION: SelectedLocation = {
    latitude: 50.0755,
    longitude: 14.4378,
    address: "Praha",
};

interface PlaceLike {
    fetchFields: (opts: { fields: string[] }) => Promise<void>;
    location?: { lat: number; lng: number } | { lat: () => number; lng: () => number };
    formattedAddress?: string;
    displayName?: string;
}

interface WindowWithGoogleMaps {
    google?: { maps: { event: { trigger: (map: unknown, name: string) => void } } };
}

function getLatLng(
    loc: PlaceLike["location"]
): { lat: number; lng: number } | null {
    if (!loc) return null;
    const lat = typeof (loc as { lat: number }).lat === "number" ? (loc as { lat: number; lng: number }).lat : (loc as { lat: () => number; lng: () => number }).lat?.();
    const lng = typeof (loc as { lng: number }).lng === "number" ? (loc as { lat: number; lng: number }).lng : (loc as { lat: () => number; lng: () => number }).lng?.();
    return lat != null && lng != null ? { lat, lng } : null;
}

export const LocationPickerModal = ({
    isOpen,
    onClose,
    initialLocation,
    initialRadius = 25000,
    areaId,
    onSuccess,
}: LocationPickerModalProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(
        initialLocation || DEFAULT_LOCATION
    );
    const [inputValue, setInputValue] = useState(
        initialLocation?.address || ""
    );
    const [radius, setRadius] = useState(initialRadius / 1000); // Convert to km
    const [isLoading, setIsLoading] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const circleRef = useRef<any>(null);
    const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
    const wasOpenRef = useRef(false);

    const placesLibrary = useMapsLibrary("places");
    const mapsLibrary = useMapsLibrary("maps");

    // Attach gmp-select (one frame delay so ref is set after custom element mounts)
    useEffect(() => {
        if (!isOpen || !placesLibrary) return;
        const onSelect = async (e: Event) => {
            const pred = (e as CustomEvent & { placePrediction?: { toPlace: () => Promise<PlaceLike> } }).placePrediction;
            if (!pred) return;
            try {
                const place = await pred.toPlace();
                await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
                const coords = getLatLng(place.location);
                const address = place.formattedAddress ?? place.displayName ?? "";
                if (coords && address) {
                    setSelectedLocation({ latitude: coords.lat, longitude: coords.lng, address });
                    setInputValue(address);
                }
            } catch (err) {
                console.error("Place fetch error:", err);
            }
        };
        let el: google.maps.places.PlaceAutocompleteElement | null = null;
        let rafId = requestAnimationFrame(() => {
            rafId = 0;
            el = autocompleteRef.current;
            el?.addEventListener("gmp-select", onSelect as EventListener);
        });
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            el?.removeEventListener("gmp-select", onSelect as EventListener);
        };
    }, [isOpen, placesLibrary]);

    // Override inner .focus-ring (blue → green) if shadow root is open
    useEffect(() => {
        if (!isOpen || !placesLibrary) return;
        let styleEl: HTMLStyleElement | null = null;
        const t = setTimeout(() => {
            const el = autocompleteRef.current as (HTMLElement & { shadowRoot?: ShadowRoot }) | null;
            if (!el?.shadowRoot) return;
            styleEl = document.createElement("style");
            styleEl.textContent = ".focus-ring { border-color: #5ccd89 !important; }";
            el.shadowRoot.appendChild(styleEl);
        }, 300);
        return () => {
            clearTimeout(t);
            styleEl?.remove();
        };
    }, [isOpen, placesLibrary]);

    // Initialize map when dialog opens (defer so Dialog portal has mounted and container has size)
    useEffect(() => {
        if (!isOpen || !mapsLibrary) return;
        const initialCenter = initialLocation ?? DEFAULT_LOCATION;
        const initialRadiusM = initialLocation ? (initialRadius ?? 25000) : 25000;
        let cancelled = false;
        let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let rafId: number | null = null;

        const google = (window as any).google;
        if (!google?.maps?.event) return;

        const initMap = () => {
            if (cancelled) return;
            const container = mapRef.current;
            if (!container) return;
            const location = { lat: initialCenter.latitude, lng: initialCenter.longitude };

            const map = new mapsLibrary.Map(container, {
                center: location,
                zoom: 12,
                mapTypeControl: false,
                streetViewControl: false,
            });

            mapInstanceRef.current = map;

            // Fix white map: container often has 0 size when dialog first opens; trigger resize once laid out
            resizeTimeoutId = setTimeout(() => {
                if (!cancelled && mapInstanceRef.current) {
                    google.maps.event.trigger(map, "resize");
                    map.setCenter(location);
                }
            }, 200);

            // Create marker
            const marker = new google.maps.Marker({
                position: location,
                map: map,
                draggable: true,
            });
            markerRef.current = marker;

            const circle = new google.maps.Circle({
                strokeColor: '#1bb550',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#5ccd89',
                fillOpacity: 0.35,
                map: map,
                center: location,
                radius: initialRadiusM,
            });
            circleRef.current = circle;

            marker.addListener("dragend", (e: any) => {
                if (e.latLng) {
                    const newLat = e.latLng.lat();
                    const newLng = e.latLng.lng();

                    // Reverse geocode to get address
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: any) => {
                        if (status === 'OK' && results && results[0]) {
                            setSelectedLocation({
                                latitude: newLat,
                                longitude: newLng,
                                address: results[0].formatted_address,
                            });
                            setInputValue(results[0].formatted_address);
                        } else {
                            setSelectedLocation({
                                latitude: newLat,
                                longitude: newLng,
                                address: `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`,
                            });
                            setInputValue(`${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
                        }
                    });

                    // Update circle center
                    circle.setCenter({ lat: newLat, lng: newLng });
                }
            });

            map.addListener("click", (e: any) => {
                if (e.latLng) {
                    const newLat = e.latLng.lat();
                    const newLng = e.latLng.lng();

                    // Move marker
                    marker.setPosition({ lat: newLat, lng: newLng });

                    // Reverse geocode to get address
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: any) => {
                        if (status === 'OK' && results && results[0]) {
                            setSelectedLocation({
                                latitude: newLat,
                                longitude: newLng,
                                address: results[0].formatted_address,
                            });
                            setInputValue(results[0].formatted_address);
                        } else {
                            setSelectedLocation({
                                latitude: newLat,
                                longitude: newLng,
                                address: `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`,
                            });
                            setInputValue(`${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
                        }
                    });

                    // Update circle center
                    circle.setCenter({ lat: newLat, lng: newLng });
                }
            });

        }; // end initMap

        // Defer so Dialog content is mounted and map container has dimensions
        rafId = requestAnimationFrame(() => {
            rafId = null;
            requestAnimationFrame(() => initMap());
        });

        return () => {
            cancelled = true;
            if (rafId != null) cancelAnimationFrame(rafId);
            if (resizeTimeoutId != null) clearTimeout(resizeTimeoutId);
            if (markerRef.current) markerRef.current.setMap(null);
            if (circleRef.current) circleRef.current.setMap(null);
            mapInstanceRef.current = null;
            if (mapRef.current) mapRef.current.innerHTML = "";
        };
    }, [isOpen, initialLocation, mapsLibrary]);

    // Sync selected location and radius to map (center, marker, circle)
    useEffect(() => {
        if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
        const location = { lat: selectedLocation.latitude, lng: selectedLocation.longitude };
        mapInstanceRef.current.setCenter(location);
        markerRef.current.setPosition(location);
        circleRef.current.setCenter(location);
        circleRef.current.setRadius(radius * 1000);
    }, [selectedLocation.latitude, selectedLocation.longitude, radius]);

    // Sync initial state only when modal transitions to open (avoid overwriting user's autocomplete selection)
    useEffect(() => {
        const justOpened = isOpen && !wasOpenRef.current;
        wasOpenRef.current = isOpen;
        if (!justOpened) return;
        if (initialLocation) {
            setSelectedLocation(initialLocation);
            setInputValue(initialLocation.address);
            setRadius((initialRadius || 25000) / 1000);
        } else {
            setSelectedLocation(DEFAULT_LOCATION);
            setInputValue(DEFAULT_LOCATION.address);
            setRadius(25);
        }
    }, [initialLocation, initialRadius, isOpen]);

    const handleRadiusChange = (value: number) => {
        setRadius(value);
    };

    const handleRecenter = () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const win = window as unknown as WindowWithGoogleMaps;
        win.google?.maps?.event?.trigger(map, "resize");
        map.setCenter({ lat: selectedLocation.latitude, lng: selectedLocation.longitude });
    };

    const reset = () => {
        setSelectedLocation(DEFAULT_LOCATION);
        setInputValue("");
        setRadius(25);
    };

    const handleSave = async () => {
        if (!selectedLocation.address) {
            toast({
                title: "Chyba",
                description: "Vyberte prosím lokaci",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const areaData: AreaInput = {
                active: true,
                radius: radius * 1000, // Convert to meters
                place: {
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                    address: selectedLocation.address,
                },
            };

            if (areaId) {
                await API.users.updateArea(areaId, areaData);
            } else {
                await API.users.addArea(areaData);
            }

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
            queryClient.invalidateQueries({ queryKey: [API_KEYS.JOBS] });

            toast({
                title: "Úspěch",
                description: areaId ? "Lokace byla aktualizována" : "Lokace byla přidána",
            });

            onSuccess?.();
            onClose();
            reset();
        } catch (error) {
            console.error("Error saving area:", error);
            toast({
                title: "Chyba",
                description: "Nepodařilo se uložit lokaci. Zkus to prosím znovu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // Generate Google Maps link for full map view
    const googleMapsLink = `https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {areaId ? "Upravit lokaci" : "Přidat lokaci"}
                    </DialogTitle>
                    <DialogDescription>
                        Vyberte lokaci a nastavte rozsah vyhledávání
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Current selection always visible (web component can't show initial value) */}
                    {inputValue ? (
                        <p className="text-sm text-muted-foreground">
                            Vybraná lokace: <span className="font-medium text-foreground">{inputValue}</span>
                        </p>
                    ) : null}
                    <div
                        className="relative h-10 w-full overflow-visible rounded-md border-2 border-input bg-background ring-offset-2 focus-within:ring-2 focus-within:ring-[#5ccd89]/30 focus-within:ring-offset-2 focus-within:border-[#5ccd89]"
                        style={{ zIndex: 1000 }}
                    >
                        {!placesLibrary && isOpen && (
                            <div className="absolute inset-0 rounded-md bg-muted animate-pulse" aria-hidden />
                        )}
                        {placesLibrary && isOpen && (
                            <div className="h-full w-full [&>gmp-place-autocomplete]:block [&>gmp-place-autocomplete]:h-full [&>gmp-place-autocomplete]:w-full">
                                <gmp-place-autocomplete
                                    ref={autocompleteRef}
                                    className="location-autocomplete-input"
                                    includedRegionCodes={["cz", "sk", "de"]}
                                    requestedLanguage="cs"

                                />
                            </div>
                        )}
                    </div>

                    {/* Map */}
                    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
                        <div ref={mapRef} className="w-full h-full" />
                    </div>


                    {/* Radius Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold uppercase">
                                Rozsah
                            </label>
                            <span className="text-lg font-semibold text-primary">
                                {radius} km
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="25"
                            step="1"
                            value={radius}
                            onChange={(e) => handleRadiusChange(Number(e.target.value))}
                            className="location-slider w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, #5ccd89 0%, #5ccd89 ${(radius / 25) * 100}%, #e5e7eb ${(radius / 25) * 100}%, #e5e7eb 100%)`,
                            }}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>1 km</span>
                            <span>25 km</span>
                        </div>
                    </div>

                    {/* Recenter Button */}
                    <Button
                        variant="outline"
                        onClick={handleRecenter}
                        disabled={!selectedLocation.address}
                        className="w-full"
                    >
                        <MapPin className="mr-2 h-4 w-4" />
                        Vycentrovat mapu
                    </Button>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        Zrušit
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!selectedLocation.address || isLoading}
                        className="min-w-[120px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Ukládám...
                            </>
                        ) : (
                            "Uložit"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
