import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const objectKey = key.join('/');

    if (!objectKey || objectKey.includes('..')) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const r2 = getR2Client();
    const response = await r2.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
    }));

    if (!response.Body) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const body = response.Body as ReadableStream;

    return new NextResponse(body as any, {
      headers: {
        'Content-Type': response.ContentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return new NextResponse('Server Error', { status: 500 });
  }
}
