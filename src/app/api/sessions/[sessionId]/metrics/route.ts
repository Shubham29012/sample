// import { NextRequest, NextResponse } from 'next/server';
// import { MetricService } from '@/lib/database/services/MetricService';
// import { z } from 'zod';
// import mongoose from 'mongoose';

// const CreateMetricSchema = z.object({
//   shapeId: z.string(),
//   nearCount: z.number().int().min(0),
//   farCount: z.number().int().min(0),
//   coverage: z.number().min(0).max(100),
//   timeElapsed: z.number().int().min(0),
//   brushColor: z.string().optional(),
//   brushSize: z.number().int().min(1).max(50).optional(),
//   totalStrokes: z.number().int().min(0).optional(),
// });

// export async function POST(
//   request: NextRequest,
//   { params }: { params: { sessionId: string } }
// ) {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(params.sessionId)) {
//       return NextResponse.json({
//         success: false,
//         error: 'Invalid session ID format',
//       }, { status: 400 });
//     }

//     const body = await request.json();
//     const validatedData = CreateMetricSchema.parse(body);
    
//     const metric = await MetricService.create({
//       sessionId: params.sessionId,
//       ...validatedData,
//     });
    
//     return NextResponse.json({
//       success: true,
//       data: {
//         id: metric._id.toString(),
//         sessionId: metric.sessionId.toString(),
//         shapeId: metric.shapeId,
//         nearCount: metric.nearCount,
//         farCount: metric.farCount,
//         coverage: metric.coverage,
//         timeElapsed: metric.timeElapsed,
//         brushColor: metric.brushColor,
//         brushSize: metric.brushSize,
//         totalStrokes: metric.totalStrokes,
//         timestamp: metric.createdAt,
//       },
//     }, { status: 201 });
//   } catch (error) {
//     console.error('Error creating metric:', error);
    
//     if (error instanceof z.ZodError) {
//       return NextResponse.json({
//         success: false,
//         error: 'Invalid input data',
//         details: error.errors,
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to create metric',
//     }, { status: 500 });
//   }
// }

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { sessionId: string } }
// ) {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(params.sessionId)) {
//       return NextResponse.json({
//         success: false,
//         error: 'Invalid session ID format',
//       }, { status: 400 });
//     }

//     const metrics = await MetricService.findBySession(params.sessionId);
    
//     return NextResponse.json({
//       success: true,
//       data: metrics.map(metric => ({
//         id: metric._id.toString(),
//         sessionId: metric.sessionId.toString(),
//         shapeId: metric.shapeId,
//         nearCount: metric.nearCount,
//         farCount: metric.farCount,
//         coverage: metric.coverage,
//         timeElapsed: metric.timeElapsed,
//         brushColor: metric.brushColor,
//         brushSize: metric.brushSize,
//         totalStrokes: metric.totalStrokes,
//         timestamp: metric.createdAt,
//       })),
//     });
//   } catch (error) {
//     console.error('Error fetching metrics:', error);
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to fetch metrics',
//     }, { status: 500 });
//   }
// }