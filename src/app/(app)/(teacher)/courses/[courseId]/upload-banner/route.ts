// exsense/src/app/api/courses/[courseId]/upload-banner/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import path from 'path';
import fs from 'fs/promises';

// --- IMPORTANT: REPLACE THESE STUBS WITH YOUR ACTUAL DATABASE AND STORAGE ---

// 1. Placeholder for your database client (e.g., Prisma, Drizzle, etc.)
// You would import your actual client and use its methods.
const db = {
  course: {
    update: async ({ where, data }: { where: { id: string }, data: { imageUrl: string } }) => {
      console.log(`DATABASE STUB: Updating course ${where.id} with imageUrl: ${data.imageUrl}`);
      // In a real application, this would be:
      // await prisma.course.update({ where, data });
      return { id: where.id, ...data };
    }
  }
};

// 2. Placeholder for your cloud storage service (e.g., AWS S3, Vercel Blob, Cloudinary)
// This function simulates uploading a file buffer and returning its public URL.
async function uploadToCloudStorage(fileBuffer: Buffer, fileName: string): Promise<string> {
    console.log(`STORAGE STUB: Uploading "${fileName}" to a cloud service...`);
    // In a real app, you would use a cloud SDK here:
    // e.g., const result = await s3.upload({ Bucket: 'your-bucket-name', Key: fileName, Body: fileBuffer }).promise();
    // return result.Location;
    
    // For this example to work out-of-the-box, we'll save it locally to a public folder.
    // This makes the file accessible via a URL like `http://localhost:3000/uploads/image.png`.
    const publicDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(publicDir, { recursive: true }); // Ensure the directory exists
    const filePath = path.join(publicDir, fileName);
    await fs.writeFile(filePath, fileBuffer);

    // The function must return the publically accessible URL.
    const publicUrl = `/uploads/${fileName}`; 
    console.log(`STORAGE STUB: File is now accessible at ${publicUrl}`);
    return publicUrl;
}
// --- END OF PLACEHOLDER SECTION ---


// The main handler for the POST request
export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // 1. Authenticate the request using Clerk
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const courseId = params.courseId;
    if (!courseId) {
        return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }

    // 2. Get the file from the incoming FormData
    const formData = await req.formData();
    const file = formData.get('banner') as File | null;

    if (!file) {
        return NextResponse.json({ message: 'No file found in the request body.' }, { status: 400 });
    }

    // 3. Convert the file to a Buffer and upload it to your storage service
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const imageUrl = await uploadToCloudStorage(fileBuffer, uniqueFileName);

    // 4. Update the course record in your database with the returned URL
    await db.course.update({
      where: { id: courseId },
      data: { imageUrl },
    });

    // 5. Return the new URL in the response so the frontend can update its state
    return NextResponse.json({ imageUrl });

  } catch (error) {
    console.error('BANNER UPLOAD API FAILED:', error);
    return NextResponse.json({ message: 'An internal error occurred while uploading the banner.' }, { status: 500 });
  }
}