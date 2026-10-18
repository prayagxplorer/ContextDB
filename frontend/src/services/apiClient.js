const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${base}/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "Cannot reach the API. Start FastAPI on port 8000 and try again.",
    );
  }
  const data = await response.json();
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail
          .map((e) => `${e.loc.slice(1).join(".")}: ${e.msg}`)
          .join("; ")
      : data.detail;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return data;
}
export function params(values) {
  const result = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined)
      result.set(key, value);
  });
  return result.toString() ? `?${result}` : "";
}
