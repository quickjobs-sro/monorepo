"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "AIzaSyDzXxhW6nUW1LkTtbK1xjvY6v2gcd7x10o";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["maps", "places"]} language="cs" region="cz">
            {children}
        </APIProvider>
    );
}
