import Image from "next/image";
import Link from "next/link";
import { MobileAppButtons } from "./MobileAppButtons";

export const Footer = () => {
    return (
        <footer className="border-t border-gray-200 mt-16 max-w-7xl mx-auto">
            <div className="px-4 md:px-16 py-8">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
                    {/* Main Footer Content */}
                    <div className="flex-1 w-full">
                        <MobileAppButtons wrapperClassName="items-start text-left lg:flex-row" textClassName="text-left" alignLeft />

                        {/* Footer Bottom Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                <Link
                                    href="mailto:info@quickjobs.cz"
                                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    info@quickjobs.cz
                                </Link>
                                <p className="text-sm text-gray-600">
                                    © 2016-{new Date().getFullYear()} by QuickJOBS. All rights reserved.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* QR Code - Hidden on mobile, visible on desktop */}
                    <div className="hidden lg:flex flex-shrink-0 ml-8">
                        <Image
                            width={156}
                            height={156}
                            src="/img/qr-app.png"
                            alt="QR kód pro stažení mobilní aplikace QuickJOBS"
                            className="object-contain"
                        />
                    </div>
                </div>
            </div>
        </footer>
    );
};

