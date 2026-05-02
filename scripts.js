const { useEffect, useMemo, useRef, useState } = React;

const defaultContacts = [
    { id: 1, name: "Mom", phone: "+1 555 0182", method: "SMS", priority: "Primary" },
    { id: 2, name: "Best Friend", phone: "+1 555 0129", method: "Phone", priority: "Backup" },
    { id: 3, name: "Safety Group", phone: "+1 555 0198", method: "Live Tracker", priority: "Group" }
];

const defaultChecklist = [
    { id: "battery", label: "Phone battery above 30%", done: true },
    { id: "route", label: "Route shared with trusted contact", done: false },
    { id: "wearable", label: "Wearable or quick trigger ready", done: true },
    { id: "network", label: "Offline backup location saved", done: true }
];

const userProfile = {
    label: "Everyday commuter",
    sensitivity: 8,
    experience: 5
};

const appLocationVersion = "bangalore-koramangala-v1";
const koramangalaCenter = {
    lat: 12.9352,
    lng: 77.6245
};

const initialDangerZones = [
    { name: "Forum Mall Junction", lat: 12.9346, lng: 77.6113, alerts: 5, risk: "High" },
    { name: "Sony World Signal", lat: 12.9359, lng: 77.6328, alerts: 4, risk: "Moderate" },
    { name: "Koramangala 5th Block", lat: 12.9349, lng: 77.6212, alerts: 6, risk: "High" },
    { name: "Jakkasandra Park", lat: 12.9279, lng: 77.6301, alerts: 2, risk: "Low" }
];

const defaultPlaces = [
    { id: "home", label: "Home", lat: 12.9324, lng: 77.6189 },
    { id: "work", label: "Work", lat: 12.9367, lng: 77.6275 }
];

const nearbyPoliceStations = [
    {
        name: "Koramangala Police Station",
        lat: 12.93814,
        lng: 77.61877,
        phone: "08022942570",
        detail: "80 Feet Road, Koramangala"
    },
    {
        name: "Adugodi Police Station",
        lat: 12.93917,
        lng: 77.61000,
        phone: "08022942563",
        detail: "Hosur Road, Adugodi"
    },
    {
        name: "Madiwala Police Station",
        lat: 12.92301,
        lng: 77.618116,
        phone: "08022942568",
        detail: "Hosur Road, Madiwala"
    }
];

const bengaluruBounds = {
    south: 12.80,
    west: 77.45,
    north: 13.15,
    east: 77.80
};

const fallbackLowCivilianZones = [
    { name: "Koramangala Industrial Area", lat: 12.9340, lng: 77.6372, type: "Industrial area", confidence: "Estimated" },
    { name: "Adugodi Industrial Belt", lat: 12.9410, lng: 77.6122, type: "Industrial/late-hour low footfall", confidence: "Estimated" },
    { name: "Madiwala Lake Edge", lat: 12.9188, lng: 77.6178, type: "Open area after dark", confidence: "Estimated" },
    { name: "Jakkasandra Back Roads", lat: 12.9258, lng: 77.6335, type: "Quiet residential stretch", confidence: "Estimated" }
];

const leafletSources = [
    {
        css: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        js: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    },
    {
        css: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
        js: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
    }
];

let leafletLoadPromise = null;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function isNearKoramangala(position) {
    return position && Math.abs(position.lat - koramangalaCenter.lat) < 0.2 && Math.abs(position.lng - koramangalaCenter.lng) < 0.2;
}

function migrateLocationStorage() {
    if (localStorage.getItem("alertHer_locationVersion") === appLocationVersion) return;
    localStorage.setItem("alertHer_locationVersion", appLocationVersion);
    localStorage.setItem("alertHer_lastLocation", JSON.stringify(createSimulatedLocation(0)));
    localStorage.setItem("alertHer_places", JSON.stringify(defaultPlaces));
}

function loadInitialLocation() {
    migrateLocationStorage();
    const cached = loadJSON("alertHer_lastLocation", null);
    return isNearKoramangala(cached) ? cached : createSimulatedLocation(0);
}

function loadInitialPlaces() {
    migrateLocationStorage();
    const cached = loadJSON("alertHer_places", defaultPlaces);
    return Array.isArray(cached) && cached.every(isNearKoramangala) ? cached : defaultPlaces;
}

function getDistanceKm(a, b) {
    if (!a || !b) return Infinity;
    const toRad = (deg) => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const R = 6371;
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function formatTime(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--";
}

function createSimulatedLocation(step) {
    return {
        lat: koramangalaCenter.lat + Math.sin(step / 5) * 0.0038,
        lng: koramangalaCenter.lng + Math.cos(step / 4) * 0.0048,
        timestamp: Date.now()
    };
}

function createId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

function cleanPhoneNumber(phone) {
    return phone.replace(/[^\d+]/g, "");
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
            if (typeof L !== "undefined") resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function loadStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
}

function loadLeaflet() {
    if (typeof L !== "undefined") return Promise.resolve();
    if (leafletLoadPromise) return leafletLoadPromise;

    leafletLoadPromise = leafletSources.reduce((promise, source) => {
        return promise.catch(() => {
            loadStylesheet(source.css);
            return loadScript(source.js);
        });
    }, Promise.reject());

    return leafletLoadPromise;
}

function getOverpassCenter(element) {
    if (typeof element.lat === "number" && typeof element.lon === "number") {
        return { lat: element.lat, lng: element.lon };
    }
    if (element.center) {
        return { lat: element.center.lat, lng: element.center.lon };
    }
    return null;
}

function createOverpassQuery(kind) {
    const bbox = `${bengaluruBounds.south},${bengaluruBounds.west},${bengaluruBounds.north},${bengaluruBounds.east}`;
    if (kind === "police") {
        return `[out:json][timeout:25];(
node["amenity"="police"](${bbox});
way["amenity"="police"](${bbox});
relation["amenity"="police"](${bbox});
);out center tags;`;
    }

    return `[out:json][timeout:25];(
way["landuse"~"industrial|construction|brownfield|railway"](${bbox});
relation["landuse"~"industrial|construction|brownfield|railway"](${bbox});
way["railway"="yard"](${bbox});
relation["railway"="yard"](${bbox});
way["natural"~"scrub|heath"](${bbox});
relation["natural"~"scrub|heath"](${bbox});
);out center tags;`;
}

async function fetchOverpass(kind) {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `data=${encodeURIComponent(createOverpassQuery(kind))}`
    });
    if (!response.ok) throw new Error(`Overpass ${kind} query failed`);
    return response.json();
}

function normalizePoliceStations(data) {
    const seen = new Set();
    return data.elements
        .map((element) => {
            const center = getOverpassCenter(element);
            const name = element.tags?.name || element.tags?.["name:en"] || "Police Station";
            if (!center) return null;
            const key = `${name}-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}`;
            if (seen.has(key)) return null;
            seen.add(key);
            return {
                name,
                lat: center.lat,
                lng: center.lng,
                phone: element.tags?.phone || element.tags?.["contact:phone"] || "100",
                detail: element.tags?.addr_full || element.tags?.["addr:street"] || "Bengaluru police station"
            };
        })
        .filter(Boolean)
        .slice(0, 120);
}

function normalizeLowCivilianZones(data) {
    const seen = new Set();
    return data.elements
        .map((element) => {
            const center = getOverpassCenter(element);
            if (!center) return null;
            const type = element.tags?.landuse || element.tags?.railway || element.tags?.natural || "low-footfall";
            const name = element.tags?.name || `${type[0].toUpperCase()}${type.slice(1)} zone`;
            const key = `${name}-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}`;
            if (seen.has(key)) return null;
            seen.add(key);
            return {
                name,
                lat: center.lat,
                lng: center.lng,
                type,
                confidence: "Estimated from map land-use data"
            };
        })
        .filter(Boolean)
        .slice(0, 45);
}

function calculateRisk(position, previousPosition, zones, sensitivity, checklist) {
    const hour = new Date().getHours();
    const timeRisk = hour >= 22 || hour < 5 ? 25 : hour >= 18 ? 15 : 5;
    const movementDistance = previousPosition ? getDistanceKm(position, previousPosition) : 0;
    const movementRisk = !previousPosition ? 8 : movementDistance < 0.02 ? 18 : movementDistance < 0.1 ? 10 : 4;
    const nearest = zones.reduce((closest, zone) => {
        const distance = getDistanceKm(position, zone);
        return distance < closest.distance ? { zone, distance } : closest;
    }, { zone: null, distance: Infinity });
    const areaRisk = nearest.distance < 0.8
        ? clamp(nearest.zone.alerts * 4 + (nearest.zone.risk === "High" ? 15 : 7), 10, 55)
        : 8;
    const activeAlerts = zones
        .filter((zone) => getDistanceKm(position, zone) < 1.2)
        .reduce((sum, zone) => sum + zone.alerts, 0);
    const crowdRisk = activeAlerts > 8 ? 22 : activeAlerts > 4 ? 14 : 6;
    const profileRisk = clamp(sensitivity * 1.5 + (10 - userProfile.experience), 5, 18);
    const checklistPenalty = checklist.filter((item) => !item.done).length * 4;
    const score = clamp(100 - (timeRisk + movementRisk + areaRisk + crowdRisk + profileRisk + checklistPenalty), 15, 100);
    const level = score < 50 ? "DANGER" : score < 75 ? "CAUTION" : "SAFE";

    return {
        score,
        level,
        timeRisk,
        movementRisk,
        areaRisk,
        crowdRisk,
        checklistPenalty,
        zonesAround: zones.filter((zone) => getDistanceKm(position, zone) < 1.2).length,
        movementLabel: movementRisk > 12 ? "Slow / stationary" : "Moving",
        nearestZone: nearest.zone,
        nearestDistance: nearest.distance
    };
}

function App() {
    const initialLocation = loadInitialLocation();
    const [darkMode, setDarkMode] = useState(loadJSON("alertHer_darkMode", false));
    const [location, setLocation] = useState(initialLocation);
    const [previousLocation, setPreviousLocation] = useState(null);
    const [dangerZones, setDangerZones] = useState(initialDangerZones);
    const [places, setPlaces] = useState(loadInitialPlaces());
    const [cityPoliceStations, setCityPoliceStations] = useState(nearbyPoliceStations);
    const [lowCivilianZones, setLowCivilianZones] = useState(fallbackLowCivilianZones);
    const [cityLayerStatus, setCityLayerStatus] = useState("Loading city safety layers...");
    const [contacts, setContacts] = useState(loadJSON("alertHer_contacts", defaultContacts));
    const [checklist, setChecklist] = useState(loadJSON("alertHer_checklist", defaultChecklist));
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [status, setStatus] = useState("Monitoring Koramangala, Bengaluru safety signals...");
    const [alertActive, setAlertActive] = useState(false);
    const [wearableArmed, setWearableArmed] = useState(true);
    const [rotationCount, setRotationCount] = useState(0);
    const [shakeCount, setShakeCount] = useState(0);
    const [unusualMotionScore, setUnusualMotionScore] = useState(18);
    const [lastWatchGesture, setLastWatchGesture] = useState("Normal walking rhythm");
    const [countdown, setCountdown] = useState(loadJSON("alertHer_countdown", 30));
    const [eventLog, setEventLog] = useState(loadJSON("alertHer_eventLog", ["Risk engine online", "Wearable channel armed", "SOS service ready"]));
    const [sensitivity, setSensitivity] = useState(loadJSON("alertHer_sensitivity", userProfile.sensitivity));
    const [trackingMode, setTrackingMode] = useState("simulated");
    const [filter, setFilter] = useState("All");
    const [toast, setToast] = useState("");
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [contactForm, setContactForm] = useState({ name: "", phone: "", method: "SMS" });
    const [reportForm, setReportForm] = useState({ name: "", risk: "Moderate", alerts: 3 });
    const [smsApiEndpoint, setSmsApiEndpoint] = useState(loadJSON("alertHer_smsApiEndpoint", ""));
    const [smsApiAuth, setSmsApiAuth] = useState(loadJSON("alertHer_smsApiAuth", ""));
    const [smsApiProvider, setSmsApiProvider] = useState(loadJSON("alertHer_smsApiProvider", "Generic"));
    const [smsApiSender, setSmsApiSender] = useState(loadJSON("alertHer_smsApiSender", ""));

    const [snatchCaptureActive, setSnatchCaptureActive] = useState(false);
    const [snatchCaptureStatus, setSnatchCaptureStatus] = useState("");
    const [snatchCaptureError, setSnatchCaptureError] = useState("");
    const [snatchCaptureSegments, setSnatchCaptureSegments] = useState([]);

    const [voiceMessageActive, setVoiceMessageActive] = useState(false);
    const [voiceMessageStatus, setVoiceMessageStatus] = useState("");
    const [voiceMessageError, setVoiceMessageError] = useState("");
    const [voiceMessageSegments, setVoiceMessageSegments] = useState([]);

    const [smsLog, setSmsLog] = useState([]);
    const [smsLogLoading, setSmsLogLoading] = useState(false);

    const captureVideoRef = useRef(null);
    const mediaStreamRef = useRef(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration);
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }, []);

    useEffect(() => {
        setSmsLogLoading(true);
        fetch('http://localhost:5000/api/sms/log')
            .then((response) => response.json())
            .then((data) => {
                setSmsLog(Array.isArray(data) ? data : []);
                setSmsLogLoading(false);
            })
            .catch((error) => {
                console.error('Failed to fetch SMS log:', error);
                setSmsLogLoading(false);
            });
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            fetch('http://localhost:5000/api/sms/log')
                .then((response) => response.json())
                .then((data) => {
                    setSmsLog(Array.isArray(data) ? data : []);
                })
                .catch((error) => console.error('SMS log fetch error:', error));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const risk = useMemo(
        () => calculateRisk(location, previousLocation, dangerZones, sensitivity, checklist),
        [location, previousLocation, dangerZones, sensitivity, checklist]
    );

    const sortedZones = useMemo(() => {
        return dangerZones
            .map((zone) => ({ ...zone, distance: getDistanceKm(location, zone) }))
            .sort((a, b) => a.distance - b.distance);
    }, [dangerZones, location]);

    const savedPlaces = useMemo(() => {
        return places.map((place) => ({ ...place, distance: getDistanceKm(location, place) }));
    }, [places, location]);

    const policeStations = useMemo(() => {
        return cityPoliceStations
            .map((station) => ({ ...station, distance: getDistanceKm(location, station) }))
            .sort((a, b) => a.distance - b.distance);
    }, [cityPoliceStations, location]);

    const quietRiskZones = useMemo(() => {
        return lowCivilianZones
            .map((zone) => ({ ...zone, distance: getDistanceKm(location, zone) }))
            .sort((a, b) => a.distance - b.distance);
    }, [lowCivilianZones, location]);

    const visibleZones = filter === "All" ? sortedZones : sortedZones.filter((zone) => zone.risk === filter);
    const currentLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const emergencyMessage = `SOS from AlertHer. I may need help. My current location is ${currentLink}. Safety level: ${risk.level}. Last updated: ${formatTime(location.timestamp)}.`;
    const checklistDone = checklist.filter((item) => item.done).length;
    const readiness = Math.round((checklistDone / checklist.length) * 100);
    const contactReadiness = clamp(contacts.length * 34, 0, 100);
    const zoneLoad = clamp(risk.zonesAround * 34, 0, 100);
    const quietZoneLoad = clamp(quietRiskZones.filter((zone) => zone.distance < 1.2).length * 34, 0, 100);
    const timerHealth = clamp((countdown / 30) * 100, 0, 100);
    const gestureProgress = clamp(((rotationCount + shakeCount) / 3) * 100, 0, 100);
    const wearableHealth = wearableArmed ? clamp(100 - unusualMotionScore + gestureProgress * 0.2, 20, 100) : 15;
    const motionTone = unusualMotionScore > 70 || gestureProgress > 65 ? "danger" : unusualMotionScore > 42 ? "warning" : "safe";

    const routeAdvice = useMemo(() => {
        const nearbyHigh = sortedZones.find((zone) => zone.distance < 0.9 && zone.risk === "High");
        if (nearbyHigh) return `Avoid ${nearbyHigh.name}. Use the main avenue and stay near well-lit sidewalks.`;
        return "Choose wide, populated streets and stay within camera-covered areas.";
    }, [sortedZones]);

    const smartPlan = useMemo(() => {
        const incomplete = checklist.find((item) => !item.done);
        if (risk.level === "DANGER") {
            return {
                title: "Escalate now",
                detail: "Share your location, stay in a visible area, and keep trusted contacts active until risk drops."
            };
        }
        if (risk.level === "CAUTION") {
            return {
                title: "Use safer route",
                detail: routeAdvice
            };
        }
        const nearestPlace = savedPlaces.reduce((closest, place) => place.distance < closest.distance ? place : closest, { distance: Infinity });
        if (nearestPlace.distance < 0.4) {
            return {
                title: `Near ${nearestPlace.label}`,
                detail: `You are ${nearestPlace.distance.toFixed(2)} km from ${nearestPlace.label}. Keep location sharing active until arrival.`
            };
        }
        if (incomplete) {
            return {
                title: "Improve readiness",
                detail: incomplete.label
            };
        }
        return {
            title: "Monitoring is stable",
            detail: "Risk signals are healthy. Keep location sharing and check-ins active."
        };
    }, [risk.level, routeAdvice, checklist, savedPlaces]);

    function showToast(message) {
        setToast(message);
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => setToast(""), 2600);
    }

    function addLog(message) {
        setEventLog((items) => {
            const next = [`${formatTime(Date.now())} - ${message}`, ...items].slice(0, 8);
            saveJSON("alertHer_eventLog", next);
            return next;
        });
    }

    async function sendInstantSms(contact, reason = "Manual alert") {
        // If no SMS API endpoint is configured, use the local backend
        if (!smsApiEndpoint) {
            const backendUrl = 'http://localhost:5000/api/sms/receive';
            const payload = {
                to: cleanPhoneNumber(contact.phone),
                contactName: contact.name,
                message: emergencyMessage,
                reason,
                location,
                riskLevel: risk.level
            };
            try {
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    addLog(`SMS alert logged for ${contact.name}`);
                    return true;
                } else {
                    throw new Error('Backend request failed');
                }
            } catch (error) {
                console.error(error);
                throw new Error("SMS operation failed. Make sure backend is running on port 5000");
            }
        }

        const headers = {
            "Content-Type": "application/json"
        };

        if (smsApiAuth) {
            if (smsApiProvider === "Twilio") {
                headers.Authorization = `Basic ${btoa(smsApiAuth)}`;
            } else {
                headers.Authorization = `Bearer ${smsApiAuth}`;
            }
        }

        const bodyPayload = smsApiProvider === "Twilio" ? {
            To: cleanPhoneNumber(contact.phone),
            From: smsApiSender || "AlertHer",
            Body: emergencyMessage
        } : {
            to: cleanPhoneNumber(contact.phone),
            contactName: contact.name,
            from: smsApiSender,
            provider: smsApiProvider,
            message: emergencyMessage,
            reason,
            location,
            riskLevel: risk.level
        };

        const response = await fetch(smsApiEndpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            throw new Error("SMS provider request failed");
        }

        addLog(`Instant SMS sent to ${contact.name}`);
        return true;
    }

    async function deleteSmsLog(smsId) {
        try {
            await fetch(`http://localhost:5000/api/sms/log/${smsId}`, { method: 'DELETE' });
            setSmsLog((current) => current.filter((sms) => sms.id !== smsId));
            showToast('SMS deleted');
        } catch (error) {
            console.error('Failed to delete SMS:', error);
        }
    }

    async function clearAllSmsLog() {
        try {
            await fetch('http://localhost:5000/api/sms/log/clear', { method: 'POST' });
            setSmsLog([]);
            showToast('All SMS cleared');
        } catch (error) {
            console.error('Failed to clear SMS log:', error);
        }
    }

    function stopMediaStream(stream) {
        if (!stream) return;
        stream.getTracks().forEach((track) => track.stop());
        if (captureVideoRef.current) {
            captureVideoRef.current.srcObject = null;
        }
        if (mediaStreamRef.current === stream) {
            mediaStreamRef.current = null;
        }
    }

    async function recordCameraSegment(facingMode, label) {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { facingMode }
        });

        mediaStreamRef.current = stream;
        if (captureVideoRef.current) {
            captureVideoRef.current.srcObject = stream;
        }

        const options = { mimeType: "video/webm;codecs=vp8,opus" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = "video/webm";
        }

        const recorder = new MediaRecorder(stream, options);
        const chunks = [];

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size) {
                chunks.push(event.data);
            }
        };

        const stopPromise = new Promise((resolve, reject) => {
            recorder.onstop = () => resolve(new Blob(chunks, { type: options.mimeType }));
            recorder.onerror = (event) => reject(event.error || new Error("Camera recording error"));
        });

        recorder.start();
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        recorder.stop();

        const blob = await stopPromise;
        stopMediaStream(stream);
        const file = new File([blob], `alertHer-${label}-${Date.now()}.webm`, { type: blob.type });

        return {
            id: createId(),
            label,
            blob,
            file,
            url: URL.createObjectURL(blob),
            createdAt: Date.now()
        };
    }

    async function shareCaptureSegment(segment) {
        if (!navigator.share || !navigator.canShare) {
            showToast("Sharing is not supported in this browser.");
            return;
        }

        const files = [segment.file || new File([segment.blob], `alertHer-${segment.label}-${segment.createdAt}.webm`, { type: segment.blob.type })];
        if (!navigator.canShare({ files })) {
            showToast("This browser cannot share files directly.");
            return;
        }

        try {
            await navigator.share({
                title: `AlertHer ${segment.label}`,
                text: `Captured by AlertHer at ${formatTime(segment.createdAt)}`,
                files
            });
            addLog(`Shared ${segment.label} capture`);
            showToast("Capture shared successfully");
        } catch (error) {
            console.error(error);
            showToast("Sharing canceled or failed");
        }
    }

    async function capturePhoneSnatchEvidence() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setSnatchCaptureError("Phone snatch capture is not supported by this browser.");
            return;
        }

        setSnatchCaptureActive(true);
        setSnatchCaptureError("");
        setSnatchCaptureStatus("Recording front camera and audio...");

        try {
            const frontSegment = await recordCameraSegment("user", "Front");
            setSnatchCaptureSegments((current) => [frontSegment, ...current]);
            setSnatchCaptureStatus("Recording back camera and audio...");
            await new Promise((resolve) => window.setTimeout(resolve, 700));

            const backSegment = await recordCameraSegment("environment", "Back");
            setSnatchCaptureSegments((current) => [backSegment, ...current]);
            setSnatchCaptureStatus("Phone snatch evidence recorded.");
            addLog("Phone snatch evidence captured from front and back cameras.");
        } catch (error) {
            console.error(error);
            setSnatchCaptureError("Unable to capture snatch evidence. Allow camera and microphone access.");
            setSnatchCaptureStatus("");
        } finally {
            stopMediaStream(mediaStreamRef.current);
            setSnatchCaptureActive(false);
        }
    }

    async function recordAudioSegment(label, duration = 7000) {
        setVoiceMessageStatus(`Recording ${label}...`);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const options = { mimeType: "audio/webm;codecs=opus" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = "audio/webm";
        }

        const recorder = new MediaRecorder(stream, options);
        const chunks = [];
        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size) {
                chunks.push(event.data);
            }
        };

        const stopPromise = new Promise((resolve, reject) => {
            recorder.onstop = () => resolve(new Blob(chunks, { type: options.mimeType }));
            recorder.onerror = (event) => reject(event.error || new Error("Audio recorder error"));
        });

        recorder.start();
        await new Promise((resolve) => window.setTimeout(resolve, duration));
        recorder.stop();

        const blob = await stopPromise;
        stopMediaStream(stream);

        return {
            id: createId(),
            label,
            blob,
            url: URL.createObjectURL(blob),
            createdAt: Date.now()
        };
    }

    async function recordVoiceMessage() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setVoiceMessageError("Voice recording is not supported by this browser.");
            return;
        }

        setVoiceMessageActive(true);
        setVoiceMessageError("");
        setVoiceMessageStatus("Recording voice message...");

        try {
            const segment = await recordAudioSegment("Voice message", 7000);
            setVoiceMessageSegments((current) => [segment, ...current]);
            setVoiceMessageStatus("Voice message recorded successfully.");
            addLog("Voice message recorded");
        } catch (error) {
            console.error(error);
            setVoiceMessageError("Unable to capture voice. Allow microphone access and try again.");
        } finally {
            setVoiceMessageActive(false);
        }
    }

    async function triggerSOS(reason) {
        if (alertActive) return;
        if (!contacts.length) {
            showToast("Add a trusted contact first");
            return;
        }

        if (!smsApiEndpoint) {
            showToast("Configure SMS API first to send emergency alerts directly.");
            setStatus("Emergency blocked: SMS API provider is required.");
            return;
        }

        setAlertActive(true);
        setShowEmergencyModal(true);
        setStatus(`Emergency alert triggered: ${reason}`);
        addLog(`SOS sent: ${reason}`);
        if (navigator.vibrate) navigator.vibrate([350, 120, 350]);

        try {
            await Promise.all(contacts.map((contact) => sendInstantSms(contact, reason)));
            showToast("Instant SMS sent to contacts");
            setStatus("Emergency SMS sent instantly to trusted contacts.");
        } catch (error) {
            console.error(error);
            showToast("SMS API failed. Check provider settings.");
            setStatus("Emergency SMS failed to send.");
        }
    }

    async function sendPrimarySms() {
        const primary = contacts[0];
        if (!primary) {
            showToast("Add a trusted contact first");
            return;
        }
        if (!smsApiEndpoint) {
            showToast("Configure SMS API first to send direct alerts.");
            return;
        }

        try {
            await sendInstantSms(primary, "Primary SMS button");
            showToast("Instant SMS sent");
        } catch (error) {
            console.error(error);
            showToast("SMS API failed. Check provider settings.");
            setStatus("Emergency SMS failed to send.");
        }
    }

    function resetCheckIn() {
        setAlertActive(false);
        setShowEmergencyModal(false);
        setCountdown(30);
        setStatus("Status: User checked in. Alert timer reset.");
        addLog("Manual check-in received");
        showToast("Check-in recorded");
    }

    function updateWatchMotion(type, intensity) {
        if (!wearableArmed) {
            setStatus("Wearable is offline. Gesture ignored.");
            showToast("Wearable is disconnected");
            return;
        }

        const scoreBoost = type === "twist" ? 24 : type === "shake" ? 20 : 8;
        const nextScore = clamp(unusualMotionScore + scoreBoost + intensity, 0, 100);
        const nextRotations = type === "twist" ? rotationCount + 1 : rotationCount;
        const nextShakes = type === "shake" ? shakeCount + 1 : shakeCount;
        const gestureTotal = nextRotations + nextShakes;

        setUnusualMotionScore(nextScore);
        setLastWatchGesture(`${type === "twist" ? "Wrist twist" : "Wrist shake"} detected at ${intensity}/10 intensity`);
        setRotationCount(nextRotations);
        setShakeCount(nextShakes);
        addLog(`Watch ${type} ${gestureTotal}/3 detected`);

        if (gestureTotal >= 3 || nextScore >= 88) {
            setRotationCount(0);
            setShakeCount(0);
            triggerSOS("Wearable wrist distress gesture detected");
        }
    }

    function simulateWatchRotation() {
        updateWatchMotion("twist", 8);
    }

    function simulateWatchShake() {
        updateWatchMotion("shake", 9);
    }

    function clearWatchGesture() {
        setRotationCount(0);
        setShakeCount(0);
        setUnusualMotionScore(18);
        setLastWatchGesture("Normal walking rhythm");
        addLog("Wearable gesture pattern cleared");
        showToast("Watch motion reset");
    }

    function copyLocation() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(currentLink)
                .then(() => {
                    setStatus("Location link copied to clipboard.");
                    addLog("Location copied");
                    showToast("Location link copied");
                })
                .catch(() => prompt("Copy this location link", currentLink));
        } else {
            prompt("Copy this location link", currentLink);
        }
    }

    function useBrowserLocation() {
        if (!navigator.geolocation) {
            setStatus("Geolocation not supported. Simulation remains active.");
            showToast("GPS is not supported here");
            return;
        }

        setTrackingMode("gps");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const nextLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: Date.now()
                };
                setPreviousLocation(location);
                setLocation(nextLocation);
                saveJSON("alertHer_lastLocation", nextLocation);
                setStatus("Live browser GPS location loaded.");
                addLog("Browser GPS synced");
                showToast("GPS synced");
            },
            () => {
                setTrackingMode("simulated");
                setStatus("GPS permission unavailable. Simulation remains active.");
                showToast("Using simulated tracking");
            },
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
        );
    }

    function addContact(event) {
        event.preventDefault();
        if (!contactForm.name.trim() || !contactForm.phone.trim()) {
            showToast("Add contact name and phone");
            return;
        }

        const nextContact = {
            id: createId(),
            name: contactForm.name.trim(),
            phone: contactForm.phone.trim(),
            method: contactForm.method,
            priority: contacts.length ? "Backup" : "Primary"
        };
        setContacts((items) => {
            const next = [...items, nextContact];
            saveJSON("alertHer_contacts", next);
            return next;
        });
        setContactForm({ name: "", phone: "", method: "SMS" });
        addLog(`Trusted contact added: ${nextContact.name}`);
        showToast("Contact added");
    }

    function removeContact(id) {
        setContacts((items) => {
            const next = items.filter((contact) => contact.id !== id);
            saveJSON("alertHer_contacts", next);
            return next;
        });
        addLog("Trusted contact removed");
    }

    function saveSmsApiConfig(event) {
        event.preventDefault();
        saveJSON("alertHer_smsApiEndpoint", smsApiEndpoint);
        saveJSON("alertHer_smsApiAuth", smsApiAuth);
        saveJSON("alertHer_smsApiProvider", smsApiProvider);
        saveJSON("alertHer_smsApiSender", smsApiSender);
        showToast("SMS API configuration saved");
        addLog("SMS API provider configured");
    }

    function clearSmsApiConfig() {
        setSmsApiEndpoint("");
        setSmsApiAuth("");
        setSmsApiProvider("Generic");
        setSmsApiSender("");
        saveJSON("alertHer_smsApiEndpoint", "");
        saveJSON("alertHer_smsApiAuth", "");
        saveJSON("alertHer_smsApiProvider", "Generic");
        saveJSON("alertHer_smsApiSender", "");
        showToast("SMS API configuration cleared");
        addLog("SMS API provider cleared");
    }

    function toggleChecklist(id) {
        setChecklist((items) => {
            const next = items.map((item) => item.id === id ? { ...item, done: !item.done } : item);
            saveJSON("alertHer_checklist", next);
            return next;
        });
    }

    function submitReport(event) {
        event.preventDefault();
        const name = reportForm.name.trim() || `Community report ${dangerZones.length + 1}`;
        const offset = (dangerZones.length + 1) * 0.00055;
        const nextZone = {
            name,
            risk: reportForm.risk,
            alerts: Number(reportForm.alerts),
            lat: location.lat + offset,
            lng: location.lng - offset
        };
        setDangerZones((zones) => [nextZone, ...zones]);
        setReportForm({ name: "", risk: "Moderate", alerts: 3 });
        addLog(`Incident report added near ${name}`);
        showToast("Community report added");
    }

    function setPlaceToCurrent(placeId) {
        const nextPlaces = places.map((place) => (
            place.id === placeId
                ? { ...place, lat: location.lat, lng: location.lng }
                : place
        ));
        setPlaces(nextPlaces);
        saveJSON("alertHer_places", nextPlaces);
        const updated = nextPlaces.find((place) => place.id === placeId);
        addLog(`${updated.label} location updated`);
        showToast(`${updated.label} saved`);
    }

    function resetPlaces() {
        setPlaces(defaultPlaces);
        saveJSON("alertHer_places", defaultPlaces);
        addLog("Home and Work reset");
        showToast("Home and Work reset");
    }

    useEffect(() => {
        document.body.classList.toggle("dark", darkMode);
        saveJSON("alertHer_darkMode", darkMode);
    }, [darkMode]);

    useEffect(() => {
        saveJSON("alertHer_sensitivity", sensitivity);
    }, [sensitivity]);

    useEffect(() => {
        saveJSON("alertHer_countdown", countdown);
    }, [countdown]);

    useEffect(() => {
        const online = () => {
            setIsOnline(true);
            addLog("Network restored");
        };
        const offline = () => {
            setIsOnline(false);
            addLog("Network offline. Local fallback active");
        };
        window.addEventListener("online", online);
        window.addEventListener("offline", offline);
        return () => {
            window.removeEventListener("online", online);
            window.removeEventListener("offline", offline);
        };
    }, []);

    useEffect(() => {
        const keyHandler = (event) => {
            if (event.key.toLowerCase() === "s" && event.altKey) {
                triggerSOS("Keyboard shortcut");
            }
            if (event.key.toLowerCase() === "c" && event.altKey) {
                resetCheckIn();
            }
        };
        window.addEventListener("keydown", keyHandler);
        return () => window.removeEventListener("keydown", keyHandler);
    }, [alertActive, currentLink]);

    useEffect(() => {
        if (trackingMode !== "gps") return undefined;
        if (!navigator.geolocation) {
            setStatus("GPS not supported by this device.");
            setTrackingMode("simulated");
            return undefined;
        }
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const next = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: position.timestamp
                };
                setPreviousLocation(location);
                setLocation(next);
                saveJSON("alertHer_lastLocation", next);
                setStatus("GPS location updated.");
            },
            (error) => {
                console.error("GPS error:", error);
                setStatus("GPS error. Switching to simulation.");
                setTrackingMode("simulated");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [trackingMode, location]);

    useEffect(() => {
        if (trackingMode !== "simulated") return undefined;
        let step = 1;
        const timer = setInterval(() => {
            setLocation((current) => {
                const next = createSimulatedLocation(step);
                step += 1;
                setPreviousLocation(current);
                saveJSON("alertHer_lastLocation", next);
                return next;
            });
            setStatus("Location updated. Monitoring active.");
        }, 4500);
        return () => clearInterval(timer);
    }, [trackingMode]);

    useEffect(() => {
        const timer = setInterval(() => {
            setDangerZones((zones) => zones.map((zone) => ({
                ...zone,
                alerts: clamp(zone.alerts + Math.floor(Math.random() * 3) - 1, 1, 9)
            })));
        }, 7000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((value) => {
                if (alertActive) return value;
                if (value <= 1) {
                    triggerSOS("No response from user");
                    return 30;
                }
                return value - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [alertActive, currentLink]);

    useEffect(() => {
        const timer = setInterval(() => {
            addLog(isOnline ? "Periodic safety check-in sent" : "Offline check-in saved locally");
        }, 30000);
        return () => clearInterval(timer);
    }, [isOnline]);

    useEffect(() => {
        if (!wearableArmed || alertActive) return undefined;

        const timer = setInterval(() => {
            setUnusualMotionScore((score) => {
                const drift = Math.random() > 0.82 ? 9 : -4;
                const nextScore = clamp(score + drift, 8, 82);
                if (nextScore > 62) {
                    setLastWatchGesture("Unusual wrist acceleration pattern");
                } else if (nextScore < 28) {
                    setLastWatchGesture("Normal walking rhythm");
                }
                return nextScore;
            });
        }, 5500);

        return () => clearInterval(timer);
    }, [wearableArmed, alertActive]);

    useEffect(() => {
        let cancelled = false;

        async function loadCityLayers() {
            try {
                const [policeData, quietData] = await Promise.all([
                    fetchOverpass("police"),
                    fetchOverpass("quiet")
                ]);
                if (cancelled) return;

                const stations = normalizePoliceStations(policeData);
                const quietZones = normalizeLowCivilianZones(quietData);

                if (stations.length) setCityPoliceStations(stations);
                if (quietZones.length) setLowCivilianZones(quietZones);
                setCityLayerStatus(`Loaded ${stations.length || nearbyPoliceStations.length} police stations and ${quietZones.length || fallbackLowCivilianZones.length} estimated quiet-risk zones.`);
                addLog("City safety layers loaded");
            } catch {
                if (cancelled) return;
                setCityLayerStatus("Using fallback city safety layers. Live map data is unavailable.");
                addLog("City safety layer fallback active");
            }
        }

        loadCityLayers();

        return () => {
            cancelled = true;
        };
    }, []);

    const shareUrl = window.location.href;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;
    const levelClass = risk.level.toLowerCase();
    return (
        <div className="app-shell">
            {toast && <div className="toast" role="status">{toast}</div>}
            {showEmergencyModal && (
                <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="emergency-title">
                    <div className="modal">
                        <p className="label">Emergency Active</p>
                        <h2 id="emergency-title">SOS workflow is running</h2>
                        <p>{smsApiEndpoint ? "Instant SMS provider is configured. Alerts are sent directly through the API." : "No SMS API configured. Configure provider to enable direct emergency SMS."}</p>
                        <div className="contact-preview">
                            {contacts.map((contact) => (
                                <button key={contact.id} onClick={async () => {
                                    if (!smsApiEndpoint) {
                                        showToast("Configure SMS API before sending direct SMS.");
                                        return;
                                    }
                                    try {
                                        await sendInstantSms(contact, "Emergency contact alert");
                                        showToast("Instant SMS sent");
                                    } catch (error) {
                                        console.error(error);
                                        showToast("SMS API failed. Check provider settings.");
                                    }
                                }}>{contact.name}</button>
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button className="btn sos" onClick={sendPrimarySms}>SEND SMS</button>
                            <button className="btn checkin" onClick={resetCheckIn}>MARK SAFE</button>
                        </div>
                    </div>
                </div>
            )}

            <aside className="sidebar">
                <div className="brand-mark">AH</div>
                <nav aria-label="Dashboard sections">
                    <a href="#overview">Overview</a>
                    <a href="#map">Map</a>
                    <a href="#contacts">Contacts</a>
                    <a href="#insights">Insights</a>
                </nav>
                <div className={`network-pill ${isOnline ? "online" : "offline"}`}>{isOnline ? "Online" : "Offline"}</div>
            </aside>

            <div className="container">
                <header className="top-bar" id="overview">
                    <div>
                        <p className="eyebrow">Women safety command center</p>
                        <h1>AlertHer</h1>
                        <p className="tagline">Smart safety before and during the incident.</p>
                        <p className="subtagline">Tracks risk, manages trusted contacts, supports offline fallback, and simulates wearable-backed emergency workflows.</p>
                    </div>
                    <div className="header-actions">
                        <button className="mode" onClick={() => setDarkMode((value) => !value)}>
                            {darkMode ? "Light Mode" : "Dark Mode"}
                        </button>
                        <button className="mode" onClick={useBrowserLocation}>Use GPS</button>
                    </div>
                </header>

                <section className="hero-grid">
                    <article className={`card summary-card ${levelClass}`}>
                        <div className="summary-head">
                            <div>
                                <p className="label">Current Safety Level</p>
                                <h2>{risk.level}</h2>
                            </div>
                            <div className="score-circle" style={{ "--score": `${risk.score * 3.6}deg` }}>
                                <span>{risk.score}</span>
                            </div>
                        </div>
                        <p className="status">{status}</p>
                        <div className="status-row">
                            <span>{trackingMode === "gps" ? "GPS tracking" : "Simulation tracking"}</span>
                            <span>Last seen: {formatTime(location.timestamp)}</span>
                        </div>
                    </article>

                    <article className="card readiness-card">
                        <div className="section-title">
                            <h3>Safety Readiness</h3>
                            <span>{readiness}%</span>
                        </div>
                        <div className="readiness-ring" style={{ "--ready": `${readiness * 3.6}deg` }}>
                            <span>{checklistDone}/{checklist.length}</span>
                        </div>
                        <div className="readiness-stack">
                            <MiniMeter label="Contacts" value={contactReadiness} />
                            <MiniMeter label="Checklist" value={readiness} />
                            <MiniMeter label="Timer" value={timerHealth} />
                        </div>
                    </article>
                </section>

                <section className="quick-stats">
                    <StatCard label="Trusted contacts" value={contacts.length} detail="ready for alerts" progress={contactReadiness} tone="safe" />
                    <StatCard label="Risk zones" value={risk.zonesAround} detail="within 1.2 km" progress={zoneLoad} tone={risk.zonesAround > 1 ? "danger" : "warning"} />
                    <StatCard label="Quiet-risk areas" value={quietRiskZones.filter((zone) => zone.distance < 1.2).length} detail="estimated nearby" progress={quietZoneLoad} tone={quietZoneLoad > 50 ? "danger" : "warning"} />
                    <StatCard label="Check-in timer" value={`${countdown}s`} detail="before escalation" progress={timerHealth} tone={countdown < 10 ? "danger" : "safe"} />
                    <StatCard label="Watch motion" value={`${Math.round(unusualMotionScore)}%`} detail={`${rotationCount + shakeCount}/3 gesture trigger`} progress={gestureProgress || unusualMotionScore} tone={motionTone} />
                </section>

                <section className="card action-card">
                    <div>
                        <p className="label">Priority Action</p>
                        <h3>Emergency Control</h3>
                        <p>One clear SOS path, plus a safe check-in to cancel automatic escalation.</p>
                    </div>
                    <button className="btn sos" onClick={() => triggerSOS("Manual SOS activated")}>SEND SOS</button>
                    <button className="btn danger" onClick={capturePhoneSnatchEvidence}>PHONE SNATCHED</button>
                    <button className="btn copy" onClick={recordVoiceMessage}>VOICE MESSAGE</button>
                    <button className="btn checkin" onClick={resetCheckIn}>I'M SAFE</button>
                    {snatchCaptureStatus && <p className="offline-note">{snatchCaptureStatus}</p>}
                    {snatchCaptureError && <p className="status danger">{snatchCaptureError}</p>}
                    {voiceMessageStatus && <p className="offline-note">{voiceMessageStatus}</p>}
                    {voiceMessageError && <p className="status danger">{voiceMessageError}</p>}
                    {snatchCaptureActive && (
                        <video ref={captureVideoRef} autoPlay muted playsInline className="capture-preview" />
                    )}
                    {snatchCaptureSegments.length > 0 && (
                        <div className="capture-history">
                            <h4>Snatch capture history</h4>
                            {snatchCaptureSegments.map((segment) => (
                                <article key={segment.id} className="capture-segment">
                                    <strong>{segment.label} camera</strong>
                                    <time>{formatTime(segment.createdAt)}</time>
                                    <video controls src={segment.url} className="capture-review" />
                                    <div className="share-buttons">
                                        <a href={segment.url} download={`alertHer-${segment.label}-${segment.createdAt}.webm`} className="btn copy">Download</a>
                                        <button className="btn call" onClick={() => shareCaptureSegment(segment)}>Share</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    {voiceMessageSegments.length > 0 && (
                        <div className="capture-history">
                            <h4>Voice message history</h4>
                            {voiceMessageSegments.map((segment) => (
                                <article key={segment.id} className="capture-segment">
                                    <strong>{segment.label}</strong>
                                    <time>{formatTime(segment.createdAt)}</time>
                                    <audio controls src={segment.url} className="capture-review" />
                                    <div className="share-buttons">
                                        <a href={segment.url} download={`alertHer-${segment.label}-${segment.createdAt}.webm`} className="btn copy">Download</a>
                                        <button className="btn call" onClick={() => shareCaptureSegment(segment)}>Share</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="card qr-section">
                    <div className="qr-card">
                        <h4>Open on your phone</h4>
                        <p>Scan this QR code or copy the link below to open AlertHer on your device.</p>
                        <img className="qr-code" src={qrCodeUrl} alt="QR code to open AlertHer on phone" />
                        <p className="qr-link">{shareUrl}</p>
                        <button className="btn copy" onClick={() => {
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(shareUrl).then(() => showToast('Link copied to clipboard')).catch(() => showToast('Copy manually: ' + shareUrl));
                            } else {
                                prompt('Copy this link', shareUrl);
                            }
                        }}>Copy link</button>
                    </div>
                </section>

                <section className="card sms-log-section">
                    <div className="section-title">
                        <h3>SMS Alert Log</h3>
                        <span>{smsLog.length} alerts</span>
                    </div>
                    {smsLogLoading && <p className="offline-note">Loading SMS alerts...</p>}
                    {smsLog.length === 0 && !smsLogLoading && <p className="offline-note">No SMS alerts received yet. Trigger an SOS to test.</p>}
                    {smsLog.length > 0 && (
                        <>
                            <ul className="sms-list">
                                {[...smsLog].reverse().map((sms) => (
                                    <li key={sms.id} className="sms-item">
                                        <div>
                                            <strong>To: {sms.to}</strong>
                                            <small>{sms.reason} • {formatTime(new Date(sms.timestamp).getTime())}</small>
                                            <p className="sms-preview">{sms.message.substring(0, 60)}...</p>
                                            <small className="risk-badge" data-risk={sms.riskLevel}>{sms.riskLevel}</small>
                                        </div>
                                        <button className="btn call" onClick={() => deleteSmsLog(sms.id)}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                            <button className="btn danger" onClick={clearAllSmsLog} style={{ marginTop: '12px', width: '100%' }}>Clear All SMS</button>
                        </>
                    )}
                </section>

                <section className="card map-card" id="map">
                    <div className="section-title">
                        <h3>Live Safety Map</h3>
                        <div className="filter-group" aria-label="Filter risk zones">
                            {["All", "High", "Moderate", "Low"].map((option) => (
                                <button
                                    key={option}
                                    className={filter === option ? "active" : ""}
                                    onClick={() => setFilter(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                    <RealSafetyMap location={location} zones={visibleZones.slice(0, 3)} places={savedPlaces} policeStations={[]} quietRiskZones={quietRiskZones} darkMode={darkMode} />
                    <p className="map-status">Map updated: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}. {cityLayerStatus}</p>
                </section>

                <main className="grid">
                    <Panel title="Live Tracking">
                        <p>Coordinates: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
                        <p>Movement: {risk.movementLabel}</p>
                        <p>Area: {routeAdvice}</p>
                        <p>Auto Alert: {alertActive ? "active" : "armed"}</p>
                        <SmartMeter label="Safety score" value={risk.score} tone={levelClass} />
                        <p className="countdown">Check in within {countdown}s or alert activates.</p>
                    </Panel>

                    <Panel title="Home & Work">
                        <div className="place-list">
                            {savedPlaces.map((place) => (
                                <div className="place-item" key={place.id}>
                                    <div>
                                        <strong>{place.label}</strong>
                                        <span>{place.distance.toFixed(2)} km away</span>
                                        <small>{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</small>
                                    </div>
                                    <button onClick={() => setPlaceToCurrent(place.id)}>Set Current</button>
                                </div>
                            ))}
                        </div>
                        <button className="text-button" onClick={resetPlaces}>Reset saved places</button>
                    </Panel>

                    <Panel title="City Police Coverage">
                        <ul className="station-list">
                            {policeStations.slice(0, 6).map((station) => (
                                <li key={station.name}>
                                    <div>
                                        <strong>{station.name}</strong>
                                        <span>{station.distance.toFixed(2)} km away</span>
                                        <small>{station.detail}</small>
                                    </div>
                                    <a href={`tel:${station.phone}`}>Call</a>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel title="Low Civilian Presence">
                        <p className="offline-note">Estimated from map land-use data. This is not live crowd density.</p>
                        <ul className="quiet-list">
                            {quietRiskZones.slice(0, 6).map((zone) => (
                                <li key={`${zone.name}-${zone.lat}-${zone.lng}`}>
                                    <strong>{zone.name}</strong>
                                    <span>{zone.type} - {zone.distance.toFixed(2)} km away</span>
                                    <small>{zone.confidence}</small>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel title="Smart Safety Plan">
                        <div className={`smart-plan ${levelClass}`}>
                            <strong>{smartPlan.title}</strong>
                            <p>{smartPlan.detail}</p>
                        </div>
                        <p>Auto decision: {risk.score < 60 ? "escalation recommended" : "continue passive monitoring"}.</p>
                        <p>Nearest risk zone: {risk.nearestZone ? `${risk.nearestZone.name} (${risk.nearestDistance.toFixed(2)} km)` : "none detected"}.</p>
                    </Panel>

                    <Panel title="Safe Route & Risk Zones">
                        <p>Best route: {routeAdvice}</p>
                        <ul className="zone-list">
                            {visibleZones.map((zone) => (
                                <li key={zone.name}>
                                    <strong>{zone.name}</strong>
                                    <span>{zone.risk} risk</span>
                                    <small>{zone.alerts} alerts - {zone.distance.toFixed(2)} km</small>
                                </li>
                            ))}
                        </ul>
                    </Panel>

                    <Panel title="Safety Checklist">
                        <div className="checklist">
                            {checklist.map((item) => (
                                <label key={item.id} className="check-item">
                                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(item.id)} />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Personal Safety Insight">
                        <p>Profile: {userProfile.label}</p>
                        <p>Behavior analysis: {risk.movementRisk > 12 ? "Stationary in sensitive area" : "Steady pace"}.</p>
                        <p>Nearby alerts: {risk.zonesAround} zones active.</p>
                        <p>Advice: {risk.score < 60 ? "Share your location and choose a safer route." : "Keep updating your position and stay aware."}</p>
                        <label className="range-label">
                            Risk sensitivity: {sensitivity}
                            <input type="range" min="4" max="12" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} />
                        </label>
                    </Panel>

                    <Panel title="Wearable Automation">
                        <p>Watch: {wearableArmed ? "armed and connected" : "offline"}</p>
                        <p>Motion status: {lastWatchGesture}</p>
                        <SmartMeter label="Unusual motion score" value={unusualMotionScore} tone={motionTone} />
                        <div className="wearable-grid">
                            <div>
                                <strong>{rotationCount}</strong>
                                <span>twists</span>
                            </div>
                            <div>
                                <strong>{shakeCount}</strong>
                                <span>shakes</span>
                            </div>
                            <div>
                                <strong>{rotationCount + shakeCount}/3</strong>
                                <span>trigger</span>
                            </div>
                        </div>
                        <p className="gesture-hint">If the phone is not in hand, twist or shake the wrist three times to trigger emergency SOS from the watch channel.</p>
                        <div className="gesture-actions">
                            <button className="btn copy" onClick={simulateWatchRotation}>SIMULATE WRIST TWIST</button>
                            <button className="btn copy" onClick={simulateWatchShake}>SIMULATE WRIST SHAKE</button>
                        </div>
                        <button className="text-button" onClick={clearWatchGesture}>Clear watch motion</button>
                        <button className="text-button" onClick={() => setWearableArmed((value) => !value)}>
                            {wearableArmed ? "Disconnect wearable" : "Reconnect wearable"}
                        </button>
                    </Panel>

                    <Panel title="Offline Protection">
                        <p>Status: {isOnline ? "Online, offline backup armed" : "OFFLINE - using last known location"}</p>
                        <p>Last location stored: {formatTime(location.timestamp)}</p>
                        <p>Periodic check-in active</p>
                        <p className="offline-note">If the phone is unavailable, wearable gestures and saved location keep the emergency flow ready.</p>
                    </Panel>

                    <Panel title="Real-time Data Insights">
                        <div className="risk-breakdown">
                            <RiskRow label="Time" value={risk.timeRisk} max={30} />
                            <RiskRow label="Movement" value={risk.movementRisk} max={25} />
                            <RiskRow label="Area" value={risk.areaRisk} max={55} />
                            <RiskRow label="Crowd" value={risk.crowdRisk} max={25} />
                            <RiskRow label="Checklist" value={risk.checklistPenalty} max={20} />
                        </div>
                    </Panel>

                    <Panel title="Live Event Stream">
                        <ul className="event-log">
                            {eventLog.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                        </ul>
                    </Panel>
                </main>

                <section className="two-column" id="contacts">
                    <article className="card">
                        <div className="section-title">
                            <h3>Trusted Contacts</h3>
                            <span>{contacts.length} active</span>
                        </div>
                        <ul className="contact-list">
                            {contacts.map((contact) => (
                                <li key={contact.id}>
                                    <div>
                                        <strong>{contact.name}</strong>
                                        <small>{contact.phone} - {contact.method} - {contact.priority}</small>
                                    </div>
                                    <div className="contact-actions">
                                        <button onClick={async () => {
                                            if (!smsApiEndpoint) {
                                                showToast("Configure SMS API before sending direct SMS.");
                                                return;
                                            }
                                            try {
                                                await sendInstantSms(contact, "Quick contact alert");
                                                showToast("Instant SMS sent");
                                            } catch (error) {
                                                console.error(error);
                                                showToast("SMS API failed. Check provider settings.");
                                            }
                                        }}>SMS</button>
                                        <button aria-label={`Remove ${contact.name}`} onClick={() => removeContact(contact.id)}>Remove</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </article>

                    <article className="card">
                        <h3>Add Contact</h3>
                        <form className="form-grid" onSubmit={addContact}>
                            <input value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} placeholder="Name" />
                            <input value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} placeholder="Phone number" />
                            <select value={contactForm.method} onChange={(event) => setContactForm({ ...contactForm, method: event.target.value })}>
                                <option>SMS</option>
                                <option>Phone</option>
                                <option>Live Tracker</option>
                            </select>
                            <button className="btn checkin" type="submit">ADD CONTACT</button>
                        </form>
                    </article>

                    <article className="card">
                        <h3>SMS API Provider</h3>
                        <form className="form-grid" onSubmit={saveSmsApiConfig}>
                            <input value={smsApiEndpoint} onChange={(event) => setSmsApiEndpoint(event.target.value)} placeholder="SMS API endpoint URL" />
                            <input value={smsApiAuth} onChange={(event) => setSmsApiAuth(event.target.value)} placeholder="Bearer token or Twilio auth" />
                            <input value={smsApiSender} onChange={(event) => setSmsApiSender(event.target.value)} placeholder="Sender / From ID" />
                            <select value={smsApiProvider} onChange={(event) => setSmsApiProvider(event.target.value)}>
                                <option>Generic</option>
                                <option>Twilio</option>
                                <option>Custom</option>
                            </select>
                            <button className="btn copy" type="submit">SAVE SMS API</button>
                            <button className="btn call" type="button" onClick={clearSmsApiConfig}>CLEAR</button>
                        </form>
                        <p>{smsApiEndpoint ? "Instant SMS provider configured. Required for direct SMS alerts." : "No SMS API configured; direct SMS alerts are disabled until you configure a provider."}</p>
                        <p className="offline-note">For Twilio, enter your REST endpoint and auth token. For generic providers, use a JSON POST endpoint. No SMS composer fallback is used.</p>
                    </article>
                </section>

                <section className="two-column" id="insights">
                    <article className="card">
                        <h3>Report Incident</h3>
                        <form className="form-grid" onSubmit={submitReport}>
                            <input value={reportForm.name} onChange={(event) => setReportForm({ ...reportForm, name: event.target.value })} placeholder="Location or landmark" />
                            <select value={reportForm.risk} onChange={(event) => setReportForm({ ...reportForm, risk: event.target.value })}>
                                <option>High</option>
                                <option>Moderate</option>
                                <option>Low</option>
                            </select>
                            <input type="number" min="1" max="9" value={reportForm.alerts} onChange={(event) => setReportForm({ ...reportForm, alerts: event.target.value })} />
                            <button className="btn copy" type="submit">ADD REPORT</button>
                        </form>
                    </article>

                    <article className="card footer-card">
                        <h3>Standard Safety Features</h3>
                        <p><strong>Incident-first design:</strong> Real-time location, movement, time, checklist, and area signals generate a dynamic safety score.</p>
                        <p><strong>Phone unavailable:</strong> Wearable triggers, pre-activated tracking, and periodic check-ins keep the response workflow active.</p>
                        <p><strong>Shortcuts:</strong> Alt+S starts SOS and Alt+C records a safe check-in.</p>
                    </article>
                </section>
            </div>
        </div>
    );
}

function StatCard({ label, value, detail, progress, tone = "safe" }) {
    return (
        <article className={`stat-card ${tone}`}>
            <div className="stat-head">
                <span>{label}</span>
                <strong>{value}</strong>
            </div>
            <div className="stat-meter" aria-label={`${label} ${Math.round(progress)} percent`}>
                <b style={{ width: `${progress}%` }}></b>
            </div>
            <small>{detail}</small>
        </article>
    );
}

function SmartMeter({ label, value, tone }) {
    return (
        <div className={`smart-meter ${tone}`}>
            <div className="meter-label">
                <span>{label}</span>
                <strong>{Math.round(value)}%</strong>
            </div>
            <div className="meter-track">
                <b style={{ width: `${value}%` }}></b>
            </div>
            <div className="meter-scale">
                <span>Danger</span>
                <span>Caution</span>
                <span>Safe</span>
            </div>
        </div>
    );
}

function MiniMeter({ label, value }) {
    return (
        <div className="mini-meter">
            <span>{label}</span>
            <div>
                <b style={{ width: `${value}%` }}></b>
            </div>
            <strong>{Math.round(value)}%</strong>
        </div>
    );
}

function RiskRow({ label, value, max }) {
    const percent = clamp((value / max) * 100, 4, 100);
    const tone = percent > 70 ? "danger" : percent > 40 ? "warning" : "safe";

    return (
        <div className={`risk-row ${tone}`}>
            <span>{label}</span>
            <div>
                <b style={{ width: `${percent}%` }}></b>
            </div>
            <strong>{value}</strong>
        </div>
    );
}

function RealSafetyMap({ location, zones, places, policeStations, quietRiskZones, darkMode }) {
    const mapElement = useRef(null);
    const mapRef = useRef(null);
    const markerLayerRef = useRef(null);
    const routeLayerRef = useRef(null);
    const tileLayerRef = useRef(null);
    const [leafletStatus, setLeafletStatus] = useState(typeof L !== "undefined" ? "ready" : "loading");

    useEffect(() => {
        let cancelled = false;

        loadLeaflet()
            .then(() => {
                if (!cancelled) setLeafletStatus("ready");
            })
            .catch(() => {
                if (!cancelled) setLeafletStatus("failed");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (leafletStatus !== "ready" || !mapElement.current || mapRef.current || typeof L === "undefined") return undefined;

        mapRef.current = L.map(mapElement.current, {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([location.lat, location.lng], 15);

        tileLayerRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        })
            .on("tileerror", () => {
                if (!mapRef.current || tileLayerRef.current?.usingFallback) return;
                mapRef.current.removeLayer(tileLayerRef.current);
                tileLayerRef.current = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                    maxZoom: 19,
                    attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
                });
                tileLayerRef.current.usingFallback = true;
                tileLayerRef.current.addTo(mapRef.current);
            })
            .addTo(mapRef.current);

        markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
        routeLayerRef.current = L.layerGroup().addTo(mapRef.current);

        return () => {
            mapRef.current.remove();
            mapRef.current = null;
            markerLayerRef.current = null;
            routeLayerRef.current = null;
            tileLayerRef.current = null;
        };
    }, [leafletStatus]);

    useEffect(() => {
        if (leafletStatus !== "ready" || typeof L === "undefined" || !mapRef.current || !markerLayerRef.current || !routeLayerRef.current) return;

        const map = mapRef.current;
        const markerLayer = markerLayerRef.current;
        const routeLayer = routeLayerRef.current;
        const userLatLng = [location.lat, location.lng];
        const colorByRisk = {
            High: "#c62828",
            Moderate: "#ef8f00",
            Low: "#ffc107"
        };

        markerLayer.clearLayers();
        routeLayer.clearLayers();

        L.circleMarker(userLatLng, {
            radius: 9,
            color: "#ffffff",
            weight: 4,
            fillColor: "#0b7cff",
            fillOpacity: 1
        })
            .bindPopup(`<strong>Your location</strong><br>${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`)
            .addTo(markerLayer);

        zones.forEach((zone) => {
            const color = colorByRisk[zone.risk] || "#3157b7";
            const zoneLatLng = [zone.lat, zone.lng];

            L.circle(zoneLatLng, {
                radius: 120 + zone.alerts * 45,
                color,
                fillColor: color,
                fillOpacity: 0.18,
                weight: 2
            }).addTo(markerLayer);

            L.circleMarker(zoneLatLng, {
                radius: 7,
                color: "#ffffff",
                weight: 2,
                fillColor: color,
                fillOpacity: 1
            })
                .bindPopup(`<strong>${zone.name}</strong><br>${zone.risk} risk<br>${zone.alerts} alerts`)
                .addTo(markerLayer);
        });

        places.forEach((place) => {
            const color = place.id === "home" ? "#3157b7" : "#6b4eff";
            L.marker([place.lat, place.lng], {
                icon: L.divIcon({
                    className: "place-marker",
                    html: `<span>${place.id === "home" ? "H" : "W"}</span>`,
                    iconSize: [34, 34],
                    iconAnchor: [17, 17]
                })
            })
                .bindPopup(`<strong>${place.label}</strong><br>${place.distance.toFixed(2)} km away`)
                .addTo(markerLayer);

            L.circle([place.lat, place.lng], {
                radius: 90,
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 2
            }).addTo(markerLayer);
        });

        policeStations.forEach((station) => {
            L.marker([station.lat, station.lng], {
                icon: L.divIcon({
                    className: "police-marker",
                    html: "<span>PS</span>",
                    iconSize: [38, 38],
                    iconAnchor: [19, 19]
                })
            })
                .bindPopup(`<strong>${station.name}</strong><br>${station.detail}<br>${station.distance.toFixed(2)} km away<br><a href="tel:${station.phone}">Call ${station.phone}</a>`)
                .addTo(markerLayer);
        });

        quietRiskZones.forEach((zone) => {
            L.circle([zone.lat, zone.lng], {
                radius: 190,
                color: "#7f1d1d",
                fillColor: "#7f1d1d",
                fillOpacity: 0.14,
                weight: 2,
                dashArray: "6 8"
            })
                .bindPopup(`<strong>${zone.name}</strong><br>Estimated low civilian presence<br>${zone.type}<br>${zone.distance.toFixed(2)} km away`)
                .addTo(markerLayer);
        });

        if (zones.length) {
            const home = places.find((place) => place.id === "home");
            const inRiskArea = risk.level !== "SAFE";
            const target = inRiskArea && home ? home : [...zones].sort((a, b) => {
                const riskRank = { Low: 1, Moderate: 2, High: 3 };
                return riskRank[a.risk] - riskRank[b.risk] || a.distance - b.distance;
            })[0];

            if (target) {
                L.polyline([userLatLng, [target.lat, target.lng]], {
                    color: inRiskArea ? (darkMode ? "#ff9800" : "#ff5722") : (darkMode ? "#61d4c3" : "#007d72"),
                    weight: 4,
                    dashArray: "10 10",
                    opacity: 0.85
                }).addTo(routeLayer);
            }
        }

        const bounds = L.latLngBounds([
            userLatLng,
            ...zones.map((zone) => [zone.lat, zone.lng]),
            ...places.map((place) => [place.lat, place.lng]),
            ...quietRiskZones.map((zone) => [zone.lat, zone.lng])
        ]);
        map.fitBounds(bounds.pad(0.22), { maxZoom: 16, animate: true });
        setTimeout(() => map.invalidateSize(), 80);
    }, [location, zones, places, policeStations, quietRiskZones, darkMode, leafletStatus]);

    if (leafletStatus !== "ready") {
        const mapsLink = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`;
        return (
            <div className="map-fallback">
                <strong>{leafletStatus === "loading" ? "Loading map..." : "Map assets blocked"}</strong>
                <span>{leafletStatus === "loading" ? "Connecting to the map provider." : "CDN or map tile access is unavailable on this network."}</span>
                <a href={mapsLink} target="_blank" rel="noreferrer">Open location in OpenStreetMap</a>
            </div>
        );
    }

    return <div className="safety-map real-map" ref={mapElement} aria-label="Interactive OpenStreetMap safety map"></div>;
}

function Panel({ title, children }) {
    return (
        <section className="card panel">
            <h3>{title}</h3>
            {children}
        </section>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
