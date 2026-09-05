"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { getBrowserApiBaseUrl } from "@/lib/api-base-url";
import { deleteMyAvatar, updateMyAvatar } from "@/lib/api-client";
import { parseApiFailure } from "@/lib/api-errors";

import { getDisplayNameInitials } from "../_utils/profile-formatters";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 25_000_000;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export type AvatarCropPoint = { x: number; y: number };
export type AvatarCropArea = { height: number; width: number; x: number; y: number };

function getCroppedImage(sourceUrl: string, area: AvatarCropArea): Promise<Blob> {
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

type UseAvatarEditorOptions = {
  avatarUrl: string | null;
  displayName: string;
};

export function useAvatarEditor({ avatarUrl, displayName }: UseAvatarEditorOptions) {
  const { protectedRequest, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<AvatarCropPoint>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<AvatarCropArea | null>(null);
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

  const handleFileChange = (file: File | undefined) => {
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

  const handleCropChange = (nextCrop: AvatarCropPoint) => {
    setCrop(nextCrop);
  };

  const handleCropComplete = (nextArea: AvatarCropArea) => {
    setCroppedArea(nextArea);
  };

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom);
  };

  const handleZoomSliderChange = (values: number[]) => {
    handleZoomChange(values[0] ?? 1);
  };

  const handleAvatarError = () => {
    setBrokenAvatarUrl(avatarUrl);
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

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) clearSource();
  };

  return {
    crop,
    croppedArea,
    errorMessage,
    handleDialogOpenChange,
    handleAvatarError,
    handleCropChange,
    handleCropComplete,
    handleFileChange,
    handleRemove,
    handleSave,
    handleSourceLoaded,
    hasAvatarImage,
    inputRef,
    isOpen,
    isSubmitting,
    resolvedAvatarUrl,
    handleZoomChange,
    handleZoomSliderChange,
    sourceUrl,
    zoom,
    displayNameInitials: getDisplayNameInitials(displayName),
  };
}
