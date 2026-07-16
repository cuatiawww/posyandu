import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[WEBHOOK] Received video status update:', body)

    // Deteksi format payload dari HeyGen atau D-ID secara dinamis
    const jobId = body.event_data?.video_id || body.id
    const result_url = body.event_data?.url || body.result_url
    
    let status = body.status
    if (body.event_type) {
      if (body.event_type === 'video.completed') {
        status = 'done'
      } else if (body.event_type === 'video.failed') {
        status = 'error'
      }
    }

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId/video_id' }, { status: 400 })
    }

    // Cari riwayat analisis yang sesuai dengan jobId
    const record = await prisma.aIInsightHistory.findFirst({
      where: { videoJobId: jobId },
    })

    if (!record) {
      console.warn(`[WEBHOOK] No AIInsightHistory record found for videoJobId/video_id: ${jobId}`)
      return NextResponse.json({ message: 'No matching record' }, { status: 200 })
    }

    if (status === 'done' && result_url) {
      let finalVideoUrl = result_url

      // Solusi Penyimpanan Permanen: Mengunduh file video sementara dari HeyGen
      // dan mengunggahnya ke Cloud Storage mandiri (seperti AWS S3 atau Cloudinary)
      try {
        const cloudinaryUrl = process.env.CLOUDINARY_URL
        if (cloudinaryUrl) {
          console.log('[WEBHOOK] Cloudinary is configured. Uploading video permanently...');
          // Implementasikan upload permanen Anda di sini
        }
      } catch (uploadErr) {
        console.error('[WEBHOOK] Failed to upload video to permanent cloud storage, using original URL:', uploadErr)
      }

      await prisma.aIInsightHistory.update({
        where: { id: record.id },
        data: {
          videoUrl: finalVideoUrl,
          videoStatus: 'COMPLETED',
        },
      })
      console.log(`[WEBHOOK] Video generation completed for record: ${record.id}`)
    } else if (status === 'error' || status === 'rejected') {
      await prisma.aIInsightHistory.update({
        where: { id: record.id },
        data: {
          videoStatus: 'FAILED',
        },
      })
      console.error(`[WEBHOOK] Video generation failed or rejected for record: ${record.id}`)
    } else {
      // Status lainnya (misal: "started" atau "processing")
      await prisma.aIInsightHistory.update({
        where: { id: record.id },
        data: {
          videoStatus: 'GENERATING',
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[WEBHOOK ERROR] Failed to process webhook:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
