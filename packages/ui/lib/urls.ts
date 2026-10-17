// Where the API is. The app calls it; the docs and the app's API page print
// it in their samples, so it lives here, where both can read it.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
