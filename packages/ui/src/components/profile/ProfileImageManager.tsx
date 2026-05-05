"use client";

import { useMutation } from "@tanstack/react-query";
import { Input } from "@ui/components/core/input";
import Cookies from "js-cookie";
import { Edit3, PlusCircle } from "lucide-react";
import React, { useState } from "react";
import { API } from "../../hooks"; // Import API for restoreUserToken
import { useToast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";
import { queryClient } from "../../Providers/ServerProvider";
import { API_KEYS } from "../../types/api_keys";
import { LoadingIndicator } from "../LoadingIndicator";

export interface ProfileImage {
  id: string;
  url: string;
  alt?: string;
  isMain?: boolean;
}

interface ProfileImageManagerProps {
  initialImages: ProfileImage[];
  /** Label for the main (avatar) empty slot. When set, "(Hlavní)" is omitted. */
  emptySlotMainLabel?: string;
}

export const ProfileImageManager: React.FC<ProfileImageManagerProps> = ({
  initialImages,
  emptySlotMainLabel,
}) => {
  const [images, setImages] = useState<ProfileImage[]>(() =>
    initialImages.map((img) => ({ ...img }))
  );
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const { toast } = useToast();

  const getRefreshedAuthToken = async (): Promise<string | null> => {
    const tokenString = Cookies.get("QuickJobs.tokens") || Cookies.get("QuickJobsPortal.tokens");
    if (!tokenString) {
      console.warn("getRefreshedAuthToken: No authentication cookie found (checked QuickJobs.tokens and QuickJobsPortal.tokens).");
      return null;
    }
    try {
      const parsedToken = JSON.parse(tokenString);
      const newFullToken = await API.restoreUserToken(parsedToken);
      if (newFullToken && newFullToken.accessToken) {
        Cookies.set("QuickJobs.tokens", JSON.stringify(newFullToken), {
          secure: true,
          sameSite: "strict",
          expires: 30,
        });
        return newFullToken.accessToken;
      } else {
        console.warn(
          "getRefreshedAuthToken: accessToken not found in restored token."
        );
        return null;
      }
    } catch (error) {
      console.error(
        "getRefreshedAuthToken: Error restoring/refreshing token:",
        error
      );
      return null;
    }
  };

  interface UploadImageMutationVariables {
    formData: FormData;
    imageType: "optional" | "body" | "avatar" | "face";
    token: string | null;
    originalSlotId: string;
    fileName: string;
    objectUrl: string;
    originalImageUrl: string | undefined;
  }

  const uploadImageFn = async (variables: UploadImageMutationVariables) => {
    const { formData, imageType, token } = variables;

    const baseUrl = "https://api.quickjobs.cz/api/";
    const endpoint = `${baseUrl}v2/me/images/${imageType}`;
    const headers: HeadersInit = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: "PUT",
      body: formData,
      headers: headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      console.error("Server error response (fetch):", errorData);
      const message =
        errorData?.message || "Nahrání obrázku se nezdařilo (direct fetch)";
      throw new Error(message);
    }

    const responseData = await response.json();
    return responseData;
  };

  const imageUploadMutation = useMutation<
    any,
    Error,
    UploadImageMutationVariables
  >({
    mutationFn: uploadImageFn,
    onSuccess: (updatedImage, variables) => {
      const { originalSlotId, fileName, imageType, objectUrl } = variables;
      URL.revokeObjectURL(objectUrl);

      const newImageUrl = updatedImage?.data?.url;

      if (!newImageUrl) {
        console.error(
          "onSuccess: New image URL not found in API response:",
          updatedImage
        );
        toast({
          title: "Chyba při zpracování odpovědi",
          description: "Server nevrátil platnou URL obrázku.",
          variant: "destructive",
        });
        return;
      }

      setImages((prevImages) =>
        prevImages.map((img) => {
          if (img.id === originalSlotId) {
            return {
              ...img,
              url: newImageUrl,
              isMain: imageType === "avatar",
            };
          }

          if (imageType === "avatar" && img.id !== originalSlotId) {
            return {
              ...img,
              isMain: false,
            };
          }

          return img;
        })
      );

      queryClient.invalidateQueries({ queryKey: [API_KEYS.PROFILE] });
      queryClient.refetchQueries({ queryKey: [API_KEYS.PROFILE] });
      toast({
        title: "Obrázek nahrán",
        description: `Soubor ${fileName} byl úspěšně nahrán`,
        variant: "default",
      });
    },
    onError: (error: Error, variables) => {
      const { originalSlotId, objectUrl, originalImageUrl } = variables;
      URL.revokeObjectURL(objectUrl);

      // Revert to the original image on error
      setImages((prevImages) =>
        prevImages.map((img) =>
          img.id === originalSlotId
            ? { ...img, url: originalImageUrl || "" }
            : img
        )
      );

      console.error("Error uploading image via mutation:", error);
      toast({
        title: "Chyba při nahrávání",
        description:
          error.message ||
          "Nepodařilo se nahrát obrázek. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUploadingImageId(null);
    },
  });

  const handleImageClick = (imageId: string) => {
    document.getElementById(`file-input-${imageId}`)?.click();
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageId: string,
    isCurrentlyMain: boolean | undefined
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Max 10MB check
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Soubor je příliš velký",
          description: "Maximální velikost obrázku je 10 MB.",
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }
      setUploadingImageId(imageId);
      const originalImage = images.find((img) => img.id === imageId);
      const objectUrl = URL.createObjectURL(file);

      setImages((prevImages) =>
        prevImages.map((img) =>
          img.id === imageId ? { ...img, url: objectUrl } : img
        )
      );


      try {
        const formData = new FormData();
        formData.append("file", file);

        let imageType: "optional" | "body" | "avatar" | "face";

        // Pokud avatar ještě neexistuje, první slot = vždy avatar (ošetření)
        const avatarExists = images.some((img) => img.isMain && !!img.url);
        const sortedOrder = [...images].sort((a, b) => {
          if (a.isMain && !b.isMain) return -1;
          if (!a.isMain && b.isMain) return 1;
          return a.id.localeCompare(b.id);
        });
        const isFirstSlotNoAvatarYet = !avatarExists && sortedOrder[0]?.id === imageId;

        if (
          isFirstSlotNoAvatarYet ||
          imageId === "avatar" ||
          imageId === "main-placeholder" ||
          isCurrentlyMain
        ) {
          imageType = "avatar";
        } else if (imageId.startsWith("body")) {
          imageType = "body";
        } else if (imageId.startsWith("face")) {
          imageType = "face";
        } else if (imageId.startsWith("optional")) {
          imageType = "optional";
        } else {
          console.warn(
            `Unknown imageId mapping for '${imageId}', defaulting to optional`
          );
          imageType = "optional";
        }

        const authTokenForMutation = await getRefreshedAuthToken();

        if (!authTokenForMutation) {
          toast({
            title: "Chyba autentizace",
            description:
              "Nepodařilo se ověřit vaši relaci. Zkuste se prosím přihlásit znovu.",
            variant: "destructive",
          });
          return;
        }

        imageUploadMutation.mutate({
          formData,
          imageType: imageType,
          token: authTokenForMutation,
          originalSlotId: imageId,
          fileName: file.name,
          objectUrl,
          originalImageUrl: originalImage?.url || "",
        });
      } catch (error: any) {
        setUploadingImageId(null);
        console.error("Error in handleFileSelected before mutation:", error);
        toast({
          title: "Chyba při přípravě nahrávání",
          description:
            error.message ||
            "Nepodařilo se připravit obrázek k nahrání. Zkuste to prosím znovu.",
          variant: "destructive",
        });
      }

      event.target.value = "";
    }
  };

  const sortedImages = React.useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [images]);

  const mainImage = sortedImages.find((img) => img.isMain);
  const otherImages = sortedImages.filter((img) => !img.isMain);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
      {sortedImages.map((image) => {
        if (!image.url) {
          return (
            <div
              key={image.id}
              onClick={() => handleImageClick(image.id)}
              className={cn(
                "aspect-square rounded-lg shadow-md flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer text-md"
              )}
            >
              <div className="flex flex-col items-center justify-center text-gray-500 w-full">
                <PlusCircle className={cn("mb-1 h-8 w-8")} />
                <p>{image.isMain && emptySlotMainLabel ? emptySlotMainLabel : "Přidat obrázek"}</p>
                {image.isMain && !emptySlotMainLabel && (
                  <span className="block text-xs font-semibold text-primary mt-1">
                    (Hlavní)
                  </span>
                )}
              </div>
              <Input
                type="file"
                id={`file-input-${image.id}`}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileSelected(e, image.id, image.isMain)}
              />
            </div>
          );
        }
        return (
          <div
            key={image.id}
            className={cn(
              "relative group rounded-lg shadow-md aspect-square",
              "transition-all duration-300 ease-in-out hover:shadow-xl"
            )}
          >
            {imageUploadMutation.isPending && uploadingImageId === image.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-10">
                <LoadingIndicator />
              </div>
            )}
            <img
              src={image.url}
              alt={image.alt || `Profile image ${image.id}`}
              className="w-full h-full object-cover rounded-lg"
            />
            {image.isMain && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 text-xs font-semibold rounded flex items-center text-white">
                Hlavní
              </div>
            )}
            <div
              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ease-in-out rounded-lg cursor-pointer"
              onClick={() =>
                !imageUploadMutation.isPending && handleImageClick(image.id)
              }
            >
              <Edit3 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out" />
            </div>
            <Input
              type="file"
              id={`file-input-${image.id}`}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileSelected(e, image.id, image.isMain)}
            />
          </div>
        );
      })}
    </div>
  );
};
