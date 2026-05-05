"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@ui/components/core/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@ui/components/core/dialog";
import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

type ImageDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  images: string[];
};

export const ImageDialog = ({
  isOpen,
  setIsOpen,
  images,
}: ImageDialogProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    api.on("select", () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api]);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader></DialogHeader>
        <div className="relative w-full">
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {images?.map((image, idx) => (
                <CarouselItem key={idx} className="basis-full">
                  <div className="relative w-full aspect-video">
                    <img
                      src={image}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentIndex === idx ? "bg-emerald-500" : "bg-gray-300"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
