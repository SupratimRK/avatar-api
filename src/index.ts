/**
 * Avatar API
 * Delivering deterministic avatars based on user ID and gender.
 */

interface Env {
  /**
   * Static assets binding provided by Cloudflare Workers
   */
  ASSETS: {
    fetch: typeof fetch;
  };
}

/**
 * Maps a string ID to a deterministic index between 1 and limit (inclusive).
 */
async function getDeterministicIndex(id: string, limit: number): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(id);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint32Array(hashBuffer);
  // Use the first 32-bit integer from the hash
  return (hashArray[0] % limit) + 1;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // 1. Extract and validate parameters
    let id = searchParams.get("id");
    let gender = searchParams.get("gender")?.toLowerCase();
    let format = searchParams.get("format")?.toLowerCase() || "webp";

    // Validate format
    const validFormats = ["webp", "png", "avif"];
    if (!validFormats.includes(format)) {
      format = "webp"; // Default to webp if invalid
    }

    // Validate gender and handle fallbacks
    const validGenders = ["boy", "girl"];
    let selectedGender: "boy" | "girl";

    if (!id && !gender) {
      // Random default if both are missing
      selectedGender = Math.random() > 0.5 ? "boy" : "girl";
      const randomIndex = Math.floor(Math.random() * 50) + 1;
      return this.serveAsset(selectedGender, randomIndex, format, env, request);
    }

    if (!id && gender) {
      // Deterministic default if gender is provided but id is missing
      selectedGender = validGenders.includes(gender) ? (gender as "boy" | "girl") : "boy";
      const deterministicIndex = await getDeterministicIndex("default-avatar", 50);
      return this.serveAsset(selectedGender, deterministicIndex, format, env, request);
    }

    // Case: id is provided (with or without gender)
    selectedGender = validGenders.includes(gender!) ? (gender as "boy" | "girl") : "boy";
    const index = await getDeterministicIndex(id!, 50);
    
    return this.serveAsset(selectedGender, index, format, env, request);
  },

  /**
   * Serves the asset from the internal assets binding.
   */
  async serveAsset(
    gender: "boy" | "girl",
    index: number,
    format: string,
    env: Env,
    request: Request
  ): Promise<Response> {
    const assetPath = `/${gender}/AV${index}.${format}`;
    const assetUrl = new URL(assetPath, request.url);

    // Fetch from the ASSETS binding
    try {
      const response = await env.ASSETS.fetch(assetUrl.toString());
      
      if (!response.ok) {
        // Fallback to a 404 avatar if something goes wrong
        const fallbackPath = `/AV404.${format}`;
        const fallbackUrl = new URL(fallbackPath, request.url);
        return await env.ASSETS.fetch(fallbackUrl.toString());
      }

      // Add descriptive headers if needed
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("X-Avatar-ID", `AV${index}`);
      newResponse.headers.set("X-Avatar-Gender", gender);
      newResponse.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      
      return newResponse;
    } catch (e) {
      return new Response("Asset not found", { status: 404 });
    }
  },
};
