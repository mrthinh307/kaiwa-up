"use client";

import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";

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
import { cn } from "@/lib/utils";

import { useAvatarEditor } from "../_hooks/use-avatar-editor";

const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false });

type AvatarEditorProps = {
  avatarUrl: string | null;
  className?: string;
  displayName: string;
};

export function AvatarEditor({ avatarUrl, className, displayName }: AvatarEditorProps) {
  const {
    crop,
    croppedArea,
    displayNameInitials,
    errorMessage,
    handleAvatarError,
    handleCropChange,
    handleCropComplete,
    handleDialogOpenChange,
    handleFileChange,
    handleRemove,
    handleSave,
    handleSourceLoaded,
    handleZoomChange,
    handleZoomSliderChange,
    hasAvatarImage,
    inputRef,
    isOpen,
    isSubmitting,
    resolvedAvatarUrl,
    sourceUrl,
    zoom,
  } = useAvatarEditor({ avatarUrl, displayName });

  const avatarDisplayContent = (
    <>
      <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-secondary-background text-3xl font-heading text-foreground shadow-shadow sm:size-32 sm:text-4xl">
        {hasAvatarImage ? (
          <Image
            alt={`${displayName}'s avatar`}
            className="rounded-full object-cover"
            fill
            onError={handleAvatarError}
            sizes="(min-width: 640px) 128px, 112px"
            src={resolvedAvatarUrl!}
            unoptimized={Boolean(avatarUrl?.startsWith("/"))}
          />
        ) : (
          <span aria-label={`${displayName}'s initials`}>{displayNameInitials}</span>
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
        className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-foreground shadow-shadow transition-transform group-hover:translate-x-boxShadowX group-hover:translate-y-boxShadowY group-hover:shadow-none sm:size-10"
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
          handleFileChange(event.target.files?.[0]);
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

      <Dialog onOpenChange={handleDialogOpenChange} open={isOpen}>
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
                  onCropChange={handleCropChange}
                  onCropComplete={(_, area) => handleCropComplete(area)}
                  onMediaLoaded={handleSourceLoaded}
                  onZoomChange={handleZoomChange}
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
                onValueChange={handleZoomSliderChange}
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
