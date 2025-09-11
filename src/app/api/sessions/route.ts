// import { NextRequest, NextResponse } from 'next/server';
// import { SessionService } from '@/lib/database/services/SessionService';
// import { z } from 'zod';

// const CreateSessionSchema = z.object({
//   userId: z.string().optional(),
// });

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const validatedData = CreateSessionSchema.parse(body);
    
//     const session = await SessionService.create(validatedData);
    
//     return NextResponse.json({
//       success: true,
//       data: {
//         id: session._id.toString(),
//         userId: session.userId,
//         createdAt: session.createdAt,
//       },
//     }, { status: 201 });
//   } catch (error) {
//     console.error('Error creating session:', error);
    
//     if (error instanceof z.ZodError) {
//       return NextResponse.json({
//         success: false,
//         error: 'Invalid input data',
//         details: error.errors,
//       }, { status: 400 });
//     }
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to create session',
//     }, { status: 500 });
//   }
// }

// export async function GET() {
//   try {
//     const sessions = await SessionService.list();
    
//     return NextResponse.json({
//       success: true,
//       data: sessions.map(session => ({
//         id: session._id.toString(),
//         userId: session.userId,
//         createdAt: session.createdAt,
//         updatedAt: session.updatedAt,
//         metricsCount: Array.isArray(session.metrics) ? session.metrics.length : 0,
//       })),
//     });
//   } catch (error) {
//     console.error('Error fetching sessions:', error);
    
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to fetch sessions',
//     }, { status: 500 });
//   }
// }