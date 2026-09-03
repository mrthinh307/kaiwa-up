"use client";

import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";
import { getBrowserApiBaseUrl } from "@/lib/api-base-url";
import { deleteMyAvatar, updateMyAvatar } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

import { getDisplayNameInitials } from "../_utils/profile-formatters";

const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false });

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 25_000_000;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

type AvatarEditorProps = {
  avatarUrl: string | null;
  className?: string;
  displayName: string;
};

type Point = { x: number; y: number };
type Area = { height: number; width: number; x: number; y: number };

function getCroppedImage(sourceUrl: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas is unavailable"));
        return;
      }
      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 512, 512);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not prepare the cropped image"));
        } else {
          resolve(blob);
        }
      }, "image/png");
    };
    image.onerror = () => reject(new Error("Could not read the selected image"));
    image.src = sourceUrl;
  });
}

export function AvatarEditor({ avatarUrl, className, displayName }: AvatarEditorProps) {
  const { protectedRequest, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState<string | null>(null);

  const resolvedAvatarUrl = avatarUrl?.startsWith("/")
    ? `${getBrowserApiBaseUrl()}${avatarUrl}`
    : avatarUrl;
  const hasAvatarImage = Boolean(resolvedAvatarUrl && brokenAvatarUrl !== avatarUrl);

  const clearSource = useCallback(() => {
    setSourceUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setCroppedArea(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  useEffect(() => {
    const currentUrl = sourceUrl;
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [sourceUrl]);

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    setErrorMessage(null);
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      setErrorMessage("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setErrorMessage("Choose an image smaller than 5 MB.");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    clearSource();
    setSourceUrl(nextUrl);
    setIsOpen(true);
  };

  const handleSourceLoaded = ({
    naturalHeight,
    naturalWidth,
  }: {
    naturalHeight: number;
    naturalWidth: number;
  }) => {
    if (naturalWidth * naturalHeight > MAX_SOURCE_PIXELS) {
      clearSource();
      setErrorMessage("Choose an image with 25 megapixels or fewer.");
      setIsOpen(false);
    }
  };

  const handleSave = async () => {
    if (!sourceUrl || !croppedArea) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const blob = await getCroppedImage(sourceUrl, croppedArea);
      if (blob.size > MAX_OUTPUT_BYTES) {
        setErrorMessage("This crop is too large. Choose a simpler image or crop again.");
        return;
      }
      const result = await protectedRequest(() => updateMyAvatar({ body: { file: blob } }));
      if (!result.data) {
        setErrorMessage(parseApiFailure(result).message);
        return;
      }
      updateUser(result.data);
      setIsOpen(false);
      clearSource();
      toast.success("Avatar updated", {
        description: "Your new avatar is now visible across KaiwaUp.",
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We could not prepare this image.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl || !window.confirm("Remove your current avatar?")) return;
    setIsSubmitting(true);
    const result = await protectedRequest(() => deleteMyAvatar());
    setIsSubmitting(false);
    if (!result.data) {
      toast.error("We could not remove your avatar", {
        description: parseApiFailure(result).message,
      });
      return;
    }
    updateUser(result.data);
    toast.success("Avatar removed");
  };

  const avatarDisplayContent = (
    <>
      <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-secondary-background text-3xl font-heading text-foreground shadow-shadow sm:size-32 sm:text-4xl">
        {hasAvatarImage ? (
          <Image
            alt={`${displayName}'s avatar`}
            className="rounded-full object-cover"
            fill
            onError={() => setBrokenAvatarUrl(avatarUrl)}
            sizes="(min-width: 640px) 128px, 112px"
            src={resolvedAvatarUrl!}
            unoptimized={Boolean(avatarUrl?.startsWith("/"))}
          />
        ) : (
          <span aria-label={`${displayName}'s initials`}>
            {getDisplayNameInitials(displayName)}
          </span>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Camera aria-hidden="true" className="size-6" />
          <span className="mt-0.5 text-[11px] font-heading tracking-wide uppercase">
            {avatarUrl ? "Edit" : "Upload"}
          </span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-foreground shadow-shadow transition-transform group-hover:translate-x-boxShadowX group-hover:translate-y-boxShadowY group-hover:shadow-none sm:size-10"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Camera className="size-4 sm:size-4.5" />
        )}
      </span>
    </>
  );

  return (
    <div className={cn("relative flex justify-center", className)}>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />

      {avatarUrl ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Manage profile avatar"
              className="group relative cursor-pointer rounded-full outline-hidden transition-transform focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              disabled={isSubmitting}
              type="button"
            >
              {avatarDisplayContent}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48" side="bottom" sideOffset={8}>
            <DropdownMenuItem
              className="cursor-pointer gap-2 font-base"
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden="true" className="size-4" />
              <span>Upload new photo</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 font-base text-destructive hover:bg-destructive! hover:text-destructive-foreground!"
              onClick={() => void handleRemove()}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              <span>Remove photo</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          aria-label="Upload profile avatar"
          className="group relative cursor-pointer rounded-full outline-hidden transition-transform focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          disabled={isSubmitting}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {avatarDisplayContent}
        </button>
      )}

      <Dialog
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) clearSource();
        }}
        open={isOpen}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Adjust your avatar</DialogTitle>
            <DialogDescription>
              Drag the image and use the slider to frame a square avatar.
            </DialogDescription>
          </DialogHeader>
          {sourceUrl ? (
            <>
              <div className="relative mx-auto h-72 w-full overflow-hidden rounded-base border-2 border-border bg-black sm:h-80">
                <Cropper
                  aspect={1}
                  classes={{}}
                  crop={crop}
                  cropShape="round"
                  cropperProps={{}}
                  image={sourceUrl}
                  keyboardStep={1}
                  maxZoom={3}
                  mediaProps={{}}
                  minZoom={1}
                  onCropChange={setCrop}
                  onCropComplete={(_, area) => setCroppedArea(area)}
                  onMediaLoaded={handleSourceLoaded}
                  onZoomChange={setZoom}
                  restrictPosition
                  rotation={0}
                  showGrid={false}
                  style={{}}
                  zoom={zoom}
                  zoomSpeed={1}
                />
              </div>
              <Slider
                aria-label="Avatar zoom"
                max={3}
                min={1}
                onValueChange={(value) => setZoom(value[0] ?? 1)}
                step={0.01}
                value={[zoom]}
              />
            </>
          ) : null}
          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="neutral"
            >
              Choose another image
            </Button>
            <Button
              disabled={isSubmitting || !croppedArea}
              onClick={() => void handleSave()}
              type="button"
            >
              {isSubmitting ? "Saving…" : "Save avatar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
