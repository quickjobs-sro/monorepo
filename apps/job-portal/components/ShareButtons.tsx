"use client";

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { TrackedButton } from "@ui/components/core/tracked-button";
import { FacebookIcon, LinkedInIcon, MessengerIcon } from "../icons";
import { cn } from "@ui/lib/utils";

interface ShareButtonsProps {
    jobId: number;
    description: string;
    className?: string;
    hideLabel?: boolean;
}

interface ShareButton {
    id: string;
    label: string;
    icon: React.ReactNode;
    bgColor: string;
    hoverBgColor: string;
    onClick: () => void;
    gaAction: string;
}

export const ShareButtons = ({ jobId, description, className, hideLabel = false }: ShareButtonsProps) => {
    const [copied, setCopied] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const url = `https://jobs.quickjobs.cz/jobs/detail/${jobId}`;
    const hashtags = "#brigada #quickjobs";

    useEffect(() => {
        setCanNativeShare(!!navigator.share);
        setIsMobile(window.innerWidth < 768);
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleNativeShare = async () => {
        try {
            await navigator.share({
                title: "QuickJOBS – nabídka práce",
                text: "Tahle nabídka by se ti mohla líbit.",
                url,
            });
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") {
                console.error("Share failed:", err);
            }
        }
    };

    const handleMessengerShare = () => {
        window.open(
            `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleLinkedInShare = () => {
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const handleFacebookShare = () => {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(description)}&hashtag=${encodeURIComponent(hashtags)}`,
            "_blank",
            "width=600,height=400"
        );
    };

    const shareButtons: ShareButton[] = [
        {
            id: "copy",
            label: "Kopírovat odkaz",
            icon: copied ? (
                <Check className="w-4 h-4 text-white" />
            ) : (
                <Copy className="w-4 h-4 text-gray-600" />
            ),
            bgColor: copied ? "bg-green-600" : "bg-gray-200",
            hoverBgColor: "hover:bg-gray-300",
            onClick: handleCopy,
            gaAction: "Copy link",
        },
        {
            id: "messenger",
            label: "Sdílet přes Messenger",
            icon: <MessengerIcon className="w-4 h-4 text-white" />,
            bgColor: "bg-[#0084FF]",
            hoverBgColor: "hover:bg-[#0073E6]",
            onClick: handleMessengerShare,
            gaAction: "Share via Messenger",
        },
        {
            id: "linkedin",
            label: "Sdílet na LinkedIn",
            icon: <LinkedInIcon className="w-4 h-4 text-white" />,
            bgColor: "bg-[#0077B5]",
            hoverBgColor: "hover:bg-[#006399]",
            onClick: handleLinkedInShare,
            gaAction: "Share on LinkedIn",
        },
        {
            id: "facebook",
            label: "Sdílet na Facebooku",
            icon: <FacebookIcon className="w-4 h-4 text-white" />,
            bgColor: "bg-[#1877F2]",
            hoverBgColor: "hover:bg-[#166FE5]",
            onClick: handleFacebookShare,
            gaAction: "Share on Facebook",
        },
    ];

    return (
        <div className={cn("mt-8 pt-6 flex flex-col items-start justify-start text-left scroll-mt-24", className)}>
            <span className="text-sm text-gray-900"><b>Víš o někom</b>, komu by se nabídka hodila?</span>
            <div className="flex items-center justify-start gap-3 mt-3 flex-wrap">
                {!hideLabel && <span className="text-sm font-semibold text-gray-900">Sdílet přes</span>}
                {canNativeShare && (
                    <TrackedButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleNativeShare}
                        gaCategory="Share"
                        gaAction="Native share"
                        gaLabel={String(jobId)}
                        className="h-10 px-3 rounded-full bg-primary text-white hover:bg-primary/90 border-0"
                        aria-label="Sdílet"
                    >
                        Sdílet
                    </TrackedButton>
                )}
                {shareButtons.filter(b => !(canNativeShare && isMobile) || b.id === "copy").map((button) => (
                    <TrackedButton
                        key={button.id}
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={button.onClick}
                        gaCategory="Share"
                        gaAction={button.gaAction}
                        gaLabel={String(jobId)}
                        className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${button.bgColor} ${button.hoverBgColor} border-0`}
                        aria-label={button.label}
                    >
                        {button.icon}
                    </TrackedButton>
                ))}
            </div>
        </div>
    );
};

