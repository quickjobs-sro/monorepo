"use client";

import React, { Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/Tabs";
import { AcceptedJobsList } from "../../components/MyJobs/AcceptedJobsList";
import { IgnoredJobsList } from "../../components/MyJobs/IgnoredJobsList";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";

export default function MyJobsPage() {
    return (
        <div className="flex flex-col min-h-screen w-full">
            <Suspense fallback={<div className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-200 py-4 h-24"></div>}>
                <Header />
            </Suspense>
            <main className="flex-1 px-6 md:px-16 max-w-full pt-4 md:pt-24">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 mt-0 md:mt-16">Moje práce</h1>

                    <Tabs defaultValue="accepted" className="w-full">
                        <TabsList className="w-full flex md:w-auto md:inline-flex">
                            <TabsTrigger value="accepted" className="flex-1 md:flex-initial">Zajímá mě</TabsTrigger>
                            <TabsTrigger value="ignored" className="flex-1 md:flex-initial">Nezajímá mě</TabsTrigger>
                        </TabsList>

                        <TabsContent value="accepted" className="mt-4">
                            <AcceptedJobsList />
                        </TabsContent>

                        <TabsContent value="ignored" className="mt-4">
                            <IgnoredJobsList />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </div>
    );
}

