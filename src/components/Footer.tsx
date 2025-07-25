import React from 'react'; 
import { MicButton } from '@/components/MicButton';
import MusicButton from '@/components/MusicButton'; 

export default function Footer() {

    return (
        <footer className="absolute bottom-[15px] w-full h-[60px] flex items-center justify-center p-4 text-xs text-gray-400 ">
            
            <div className="flex items-center gap-x-16 sm:gap-x-22 md:gap-x-32 lg:gap-x-42">
               
                <div className="flex items-center gap-x-4 -translate-x-8 sm:-translate-x-12 md:-translate-x-16 lg:-translate-x-20">
                    <MicButton />
                    <MusicButton />
                </div>

                <div>
                    {/* <button className="bg-blue-500 text-white px-4 py-2 rounded-[50px]">Send</button> */}
                </div>
            </div>
        </footer>
    );
}