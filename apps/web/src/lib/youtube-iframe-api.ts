type YouTubeGlobalApi = {
  Player?: unknown;
};

type YouTubeGlobals = {
  YT?: YouTubeGlobalApi;
  onYouTubeIframeAPIReady?: () => void;
};

const YOUTUBE_IFRAME_API_SCRIPT_ID = "youtube-iframe-api";
const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

let youtubeApiPromise: Promise<unknown> | undefined;

function getYouTubeGlobals(): YouTubeGlobals {
  return window as unknown as YouTubeGlobals;
}

function getLoadedYouTubeApi(): YouTubeGlobalApi | null {
  const youtubeApi = getYouTubeGlobals().YT;
  return youtubeApi && typeof youtubeApi.Player === "function" ? youtubeApi : null;
}

export function loadYouTubeIframeApi<TApi>(): Promise<TApi> {
  const loadedApi = getLoadedYouTubeApi();
  if (loadedApi) {
    return Promise.resolve(loadedApi as TApi);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise as Promise<TApi>;
  }

  youtubeApiPromise = new Promise<unknown>((resolve, reject) => {
    const resolveApi = () => {
      const api = getLoadedYouTubeApi();
      if (api) {
        resolve(api);
      }
    };
    const rejectApi = () => {
      youtubeApiPromise = undefined;
      reject(new Error("YouTube IFrame API failed to load"));
    };
    const youtubeGlobals = getYouTubeGlobals();
    const previousReadyCallback = youtubeGlobals.onYouTubeIframeAPIReady;

    youtubeGlobals.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.();
      resolveApi();
    };

    const existingScript = document.getElementById(YOUTUBE_IFRAME_API_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", resolveApi, { once: true });
      existingScript.addEventListener("error", rejectApi, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.id = YOUTUBE_IFRAME_API_SCRIPT_ID;
    script.onerror = rejectApi;
    script.src = YOUTUBE_IFRAME_API_URL;
    document.head.append(script);
  });

  return youtubeApiPromise as Promise<TApi>;
}
