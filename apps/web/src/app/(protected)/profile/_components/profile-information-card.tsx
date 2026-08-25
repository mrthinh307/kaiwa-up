"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updateMe } from "@/lib/api-client";
import { normalizeApiFieldName, parseApiFailure } from "@/lib/api-errors";

import { profileSchema, type ProfileValues } from "../_validations/profile-schema";

type ProfileInformationCardProps = {
  displayName: string;
  email: string;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
};

export function ProfileInformationCard({
  displayName,
  email,
  isEditing,
  onEditingChange,
}: ProfileInformationCardProps) {
  const { protectedRequest, updateUser } = useAuth();
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ProfileValues>({
    defaultValues: { displayName },
    resolver: zodResolver(profileSchema),
  });

  const handleEdit = () => {
    reset({ displayName });
    onEditingChange(true);
  };

  const handleCancel = () => {
    reset({ displayName });
    onEditingChange(false);
  };

  const handleSave = async (values: ProfileValues) => {
    if (values.displayName === displayName) {
      toast.info("No changes to save", { description: "Your display name is already up to date." });
      return;
    }

    const result = await protectedRequest(() =>
      updateMe({ body: { display_name: values.displayName } }),
    );

    if (!result.data) {
      const failure = parseApiFailure(result);
      const displayNameError = failure.fieldErrors.find(
        (fieldError) => normalizeApiFieldName(fieldError.field) === "displayName",
      );

      if (displayNameError) {
        setError("displayName", { message: displayNameError.message });
      } else {
        setError("root.server", { message: failure.message });
      }

      toast.error("We could not update your profile", { description: failure.message });
      return;
    }

    const savedDisplayName = result.data.display_name?.trim() || result.data.email;
    updateUser(result.data);
    reset({ displayName: savedDisplayName });
    onEditingChange(false);
    toast.success("Profile updated", { description: "Your display name has been saved." });
  };

  return (
    <Card className="bg-secondary-background">
      <CardHeader className="gap-3">
        <CardTitle className="text-xl sm:text-2xl">Personal information</CardTitle>
        <CardDescription>Manage the details people see across KaiwaUp.</CardDescription>
        {!isEditing && (
          <CardAction>
            <Button className="h-9 px-3" onClick={handleEdit} size="sm" type="button">
              <Pencil aria-hidden="true" />
              Edit profile
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {isEditing ? (
        <form onSubmit={handleSubmit(handleSave)} noValidate>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="profile-display-name">Display name</Label>
              <Input
                aria-describedby={errors.displayName ? "profile-display-name-error" : undefined}
                aria-invalid={Boolean(errors.displayName)}
                autoComplete="name"
                disabled={isSubmitting}
                id="profile-display-name"
                {...register("displayName")}
              />
              {errors.displayName?.message && (
                <p className="text-sm text-destructive" id="profile-display-name-error">
                  {errors.displayName.message}
                </p>
              )}
              {errors.root?.server?.message && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.root.server.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" readOnly type="email" value={email} />
              <p className="text-sm text-foreground/65">Email changes are not available yet.</p>
            </div>
          </CardContent>

          <CardFooter className="mt-6 flex-col-reverse gap-3 border-t-2 border-border pt-6 sm:flex-row sm:justify-end">
            <Button
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={handleCancel}
              type="button"
              variant="neutral"
            >
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" disabled={isSubmitting || !isDirty} type="submit">
              {isSubmitting ? "Saving changes…" : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      ) : (
        <CardContent>
          <dl className="overflow-hidden rounded-base border-2 border-border bg-background">
            <div className="border-b-2 border-border p-4 sm:grid sm:grid-cols-[160px_1fr] sm:gap-6">
              <dt className="text-sm font-heading">Display name</dt>
              <dd className="mt-1 break-words sm:mt-0">{displayName}</dd>
            </div>
            <div className="p-4 sm:grid sm:grid-cols-[160px_1fr] sm:gap-6">
              <dt className="text-sm font-heading">Email</dt>
              <dd className="mt-1 break-all sm:mt-0">{email}</dd>
            </div>
          </dl>
        </CardContent>
      )}
    </Card>
  );
}
