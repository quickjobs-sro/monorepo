import API, {
    NOTIFICATION_CHANNEL,
    NOTIFICATION_TRIGGER,
} from "quickjobs-api-wrapper";
import type { AreaInput } from "quickjobs-api-wrapper";
import type { StoredAuthToken } from "./authSession";

let configured = false;

function configureLegacyApi(): void {
    if (configured) {
        return;
    }

    API.configure({
        url: process.env.NEXT_PUBLIC_API_AUTH_URL || "https://api.quickjobs.cz/api/",
        clientId: process.env.NEXT_PUBLIC_API_CLIENT_ID || "web-app-0BjdRThl0qULR6x2",
        secret: process.env.NEXT_PUBLIC_API_SECRET || "MVgF8m7mM1qNXsQp",
        revision: process.env.NEXT_PUBLIC_API_REVISION || "2.4.0",
        debug: true,
    });
    configured = true;
}

configureLegacyApi();

export async function syncLegacyAuthToken(token: StoredAuthToken): Promise<void> {
    configureLegacyApi();
    await API.restoreUserToken(token as never);
}

export { NOTIFICATION_CHANNEL, NOTIFICATION_TRIGGER };
export type { AreaInput };
export default API;

