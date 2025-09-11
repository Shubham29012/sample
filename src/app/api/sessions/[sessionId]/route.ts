// import { NextRequest, NextResponse } from 'next/server';
// import { SessionService } from '@/lib/database/services/SessionService';
// import mongoose from 'mongoose';

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { sessionId: string } }
// ) {
//   try {
//     // Validate ObjectId format
//     if (!mongoose.Types.ObjectId.isValid(params.sessionId)) {
//       return NextResponse.json({
//         success: false,
//         error: 'Invalid session ID format',
//       }, { status: 400 });
//     }

//     const session = await SessionService.findById(params.sessionId);
    
//     if (!session) {
//       return NextResponse.json({
//         success: false,
//         error: 'Session not found',
//       }, { status: 404 });
//     }
    
//     return NextResponse.json({
//       success: true,
//       data: {
//         id: session._id.toString(),
//         userId: session.userId,
//         createdAt: session.createdAt,
//         updatedAt: session.updatedAt,
//         metrics: Array.isArray(session.metrics) ? session.metrics.map(metric => ({
//           id: metric._id.toString(),
//           shapeId: metric.shapeId,
//           nearCount: metric.nearCount,
//           farCount: metric.farCount,
//           coverage: metric.coverage,
//           timeElapsed: metric.timeElapsed,
//           brushColor: metric.brushColor,
//           brushSize: metric.brushSize,
//           totalStrokes: metric.totalStrokes,
//           timestamp: metric.createdAt,
//         })) : [],
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching session:', error);
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to fetch session',
//     }, { status: 500 });
//   }
// }

// export async function DELETE(
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

//     const deleted = await SessionService.delete(params.sessionId);
    
//     if (!deleted) {
//       return NextResponse.json({
//         success: false,
//         error: 'Session not found',
//       }, { status: 404 });
//     }
    
//     return NextResponse.json({
//       success: true,
//       message: 'Session deleted successfully',
//     });
//   } catch (error) {
//     console.error('Error deleting session:', error);
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to delete session',
//     }, { status: 500 });
//   }
// }