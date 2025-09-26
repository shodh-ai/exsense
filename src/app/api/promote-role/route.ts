// src/app/api/promote-role/route.ts

import { auth, currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { userId } = await auth(); // Get the current user's ID
    const user = await currentUser(); // Get the full user object

    if (!userId || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { role } = await req.json();

        if (typeof role !== 'string' || (role !== 'learner' && role !== 'expert')) {
            return NextResponse.json({ error: 'Invalid role provided' }, { status: 400 });
        }

        // Update the user's public metadata using clerkClient
        const client = await clerkClient();
        await client.users.updateUser(user.id, {
            publicMetadata: {
                ...user.publicMetadata, // Keep existing public metadata
                role: role // Set or overwrite the role
            }
        });

        return NextResponse.json({ message: 'User role updated successfully' }, { status: 200 });

    } catch (error) {
        console.error("Error promoting user role:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}