"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  AlertCircle,
  User,
  BookOpen,
} from "lucide-react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    subject?: string | null;
    teacher_name?: string | null;
    course_name?: string | null;
    duration?: string | null;
    video_url: string;
    storage_key?: string | null;
    description?: string | null;
  } | null;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube watch or short URL
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&modestbranding=1&rel=0`;
  }
  // Vimeo URL
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }
  return null;
}

export default function VideoPlayerModal({ isOpen, onClose, video }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playbackUrl, setPlaybackUrl] = useState<string>("");
  const [loadingPlayback, setLoadingPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch authorized playback URL if video has a storage_key or needs server auth
  const loadPlaybackUrl = useCallback(async () => {
    if (!video) return;
    setHasError(false);
    setErrorMessage("");
    setLoadingPlayback(true);

    try {
      // Call secure playback endpoint
      const res = await fetch(`/api/recorded-classes/${video.id}/playback`);
      const data = await res.json();

      if (res.ok && data.playbackUrl) {
        setPlaybackUrl(data.playbackUrl);
      } else {
        // Fallback to video_url if API fails or for direct external urls
        if (video.video_url) {
          setPlaybackUrl(video.video_url);
        } else {
          throw new Error(data.error || "Unable to retrieve video stream.");
        }
      }
    } catch (err: any) {
      console.warn("Playback URL fetch error, trying direct video_url fallback:", err);
      if (video?.video_url) {
        setPlaybackUrl(video.video_url);
      } else {
        setHasError(true);
        setErrorMessage(err.message || "Unable to play this video right now.");
      }
    } finally {
      setLoadingPlayback(false);
    }
  }, [video]);

  useEffect(() => {
    if (isOpen && video) {
      loadPlaybackUrl();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setHasError(false);
    } else {
      setPlaybackUrl("");
      setIsPlaying(false);
    }
  }, [isOpen, video, loadPlaybackUrl]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Space to play/pause, M to mute, F for fullscreen, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.code === "Space" || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPlaying, isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.error("Playback failed:", err);
        setHasError(true);
        setErrorMessage("Unable to play this video right now.");
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setHasError(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  if (!isOpen || !video) return null;

  const embedUrl = getEmbedUrl(playbackUrl || video.video_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full max-w-5xl max-h-[calc(100vh-24px)] bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 z-20">
          <div className="flex items-center gap-3 overflow-hidden pr-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600/30 text-brand-400 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                {video.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                {video.course_name && (
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-brand-400" />
                    {video.course_name}
                  </span>
                )}
                {video.subject && <span>• {video.subject}</span>}
                {video.teacher_name && (
                  <span className="hidden sm:inline-flex items-center gap-1">
                    • <User className="w-3 h-3" /> {video.teacher_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Close player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Screen Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[260px] sm:min-h-[380px] md:min-h-[460px] overflow-hidden group">
          {loadingPlayback ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs sm:text-sm font-medium">Securing authorized video stream...</p>
            </div>
          ) : hasError ? (
            <div className="p-6 text-center max-w-md">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Unable to play this video right now.</h3>
              <p className="text-xs text-slate-400 mb-4">{errorMessage || "The video stream is unavailable or unauthorized."}</p>
              <button
                type="button"
                onClick={loadPlaybackUrl}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Playback
              </button>
            </div>
          ) : embedUrl ? (
            // Embedded iframe player (YouTube, Vimeo)
            <iframe
              src={embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full min-h-[340px] sm:min-h-[440px] border-0"
            />
          ) : (
            // Native HTML5 video player with custom controls
            <>
              <video
                ref={videoRef}
                src={playbackUrl}
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  setHasError(true);
                  setErrorMessage("Unable to play this video right now.");
                }}
                playsInline
                className="w-full h-full max-h-[65vh] object-contain cursor-pointer"
              />

              {/* Big Center Play Button Overlay */}
              {!isPlaying && !hasError && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand-600/90 hover:bg-brand-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-xs transition-transform hover:scale-105 active:scale-95 z-10"
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-0.5" />
                </button>
              )}

              {/* Custom Bottom Control Bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-20 ${
                  showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
              >
                {/* Seek Bar */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-mono text-slate-300 shrink-0">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 focus:outline-none"
                  />
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control buttons row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="p-2 text-white hover:text-brand-400 rounded-lg transition-colors"
                      title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <div className="flex items-center gap-1.5 group/vol">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title={isMuted ? "Unmute (M)" : "Mute (M)"}
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Speed dropdown */}
                    <div className="flex items-center rounded-lg bg-slate-800/80 border border-slate-700/60 p-0.5 text-xs">
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => changePlaybackRate(rate)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                            playbackRate === rate ? "bg-brand-600 text-white font-bold" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="p-2 text-slate-300 hover:text-white rounded-lg transition-colors"
                      title="Fullscreen (F)"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Details */}
        {video.description && (
          <div className="p-4 bg-slate-900 border-t border-slate-800/80 text-xs text-slate-300 max-h-24 overflow-y-auto">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
              Class Notes & Summary
            </span>
            <p className="leading-relaxed whitespace-pre-wrap">{video.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
