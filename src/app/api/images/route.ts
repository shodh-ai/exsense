import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GoogleCSEItem = {
  link: string;
  mime?: string;
  image?: {
    width?: number;
    height?: number;
    byteSize?: number;
    thumbnailLink?: string;
  };
};

type RequestBody = {
  query: string;
  safe?: 'active' | 'off' | 'high' | 'medium';
  num?: number;
  imgSize?: 'icon' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'huge';
  imgType?: 'clipart' | 'face' | 'lineart' | 'news' | 'photo';
};

function getEnv(name: string) {
  return process.env[name] || process.env[`NEXT_PUBLIC_${name}`];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const query = body?.query?.toString().trim();
    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const apiKey = getEnv('GOOGLE_CSE_API_KEY');
    const cx = getEnv('GOOGLE_CSE_CX');
    if (!apiKey || !cx) {
      return NextResponse.json({ error: 'Missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX in env' }, { status: 500 });
    }

    const params = new URLSearchParams({
      key: apiKey as string,
      cx: cx as string,
      q: query,
      searchType: 'image',
      safe: body.safe || 'active',
      num: String(body.num || 3),
    });

    if (body.imgSize) params.set('imgSize', body.imgSize);
    if (body.imgType) params.set('imgType', body.imgType);

    const searchUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 0 } });
    if (!searchRes.ok) {
      const text = await searchRes.text();
      return NextResponse.json({ error: 'Google CSE error', details: text }, { status: 502 });
    }

    const data = (await searchRes.json()) as { items?: GoogleCSEItem[] };
    const item = data.items?.find((i) => !!i.link);
    if (!item?.link) {
      return NextResponse.json({ error: 'No image results' }, { status: 404 });
    }

    // Fetch the image bytes so we can return a dataURL (avoids CORS & hotlinking)
    const imgRes = await fetch(item.link);
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image bytes' }, { status: 502 });
    }

    const arrayBuf = await imgRes.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const base64 = buf.toString('base64');
    const mime = imgRes.headers.get('content-type') || item.mime || 'image/jpeg';
    const dataURL = `data:${mime};base64,${base64}`;

    return NextResponse.json({
      dataURL,
      mimeType: mime,
      src: item.link,
      width: item.image?.width,
      height: item.image?.height,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error', details: err?.message || String(err) }, { status: 500 });
  }
}
