import ToasterClient from "@/components/providers/ToasterClient";
import QueryProvider from "@/components/providers/QueryProvider";
import { PageContentManager } from "@/components/utility/PageContentManager";
import { NavigationEvents } from "@/components/utility/NavigationEvents";
import SidebarContainer from "@/components/utility/SidebarContainer"; // Use container to conditionally hide sidebar
import React, { Suspense } from "react";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryProvider>
      <div className="m-0 overflow-hidden w-screen h-screen relative flex items-center justify-center">

        {/* Sidebar is conditionally rendered via SidebarContainer */}
        <SidebarContainer />

        {/* Your original background elements - UNCHANGED */}
        <div className="bottom-0 left-0 w-[60%] aspect-square absolute translate-x-[-50%] translate-y-[50%] after:content-[''] after:absolute after:inset-0 after:bg-[radial-gradient(50%_50%_at_50%_50%,rgba(51,109,230,0.25)_0%,rgba(51,109,230,0.1)_40%,rgba(51,109,230,0.01)_80%,transparent_100%)] rounded-full -z-10" />
        <div className="top-0 right-0 w-[70%] aspect-square absolute translate-x-[60%] translate-y-[-55%] rounded-full after:content-[''] after:absolute after:inset-0 after:bg-[radial-gradient(50%_50%_at_50%_50%,rgba(86,111,233,0.4)_0%,rgba(86,111,233,0.3)_40%,rgba(86,111,233,0.2)_60%,transparent_100%)] -z-10" />
        <div className="w-screen h-screen flex flex-col items-center justify-start -z-[1]">
          <div className="w-[97%] h-[85%] flex items-center justify-center bg-white/[0.01] shadow-[inset_0px_0px_60px_rgba(86,111,233,0.2)] rounded-2xl mt-4 backdrop-blur-sm" />
          <div className="w-[12%] aspect-[2/1] rounded-b-full bg-white/[0.01] shadow-[inset_0px_0px_60px_rgba(234,237,251,1)] backdrop-blur-sm" />
        </div>

        {/* Main Content Area */}
        <div className="absolute top-0 left-0 h-screen w-screen z-[1] flex flex-col items-center justify-start">
          {/*
            KEY CHANGE: The `pl-20` padding has been REMOVED from this line,
            as the sidebar is now hidden by default and should not affect the content layout.
          */}
          <div className="w-[97%] h-[87%] flex items-start justify-start mt-4 rounded-2xl overflow-x-hidden overflow-y-hidden">
            <PageContentManager>
              {children}
            </PageContentManager>
          </div>
          <ToasterClient />
        </div>

        <Suspense fallback={null}>
          <NavigationEvents />
        </Suspense>
      </div>
    </QueryProvider>
  );
}