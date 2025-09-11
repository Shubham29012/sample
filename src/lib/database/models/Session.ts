// import mongoose, { Document, Schema } from 'mongoose';

// export interface ISession extends Document {
//   _id: string;
//   userId?: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const SessionSchema = new Schema<ISession>(
//   {
//     userId: {
//       type: String,
//       required: false,
//     },
//   },
//   {
//     timestamps: true,
//     collection: 'sessions',
//   }
// );

// // Add virtual for metrics
// SessionSchema.virtual('metrics', {
//   ref: 'Metric',
//   localField: '_id',
//   foreignField: 'sessionId',
// });

// // Ensure virtual fields are serialised
// SessionSchema.set('toJSON', { virtuals: true });
// SessionSchema.set('toObject', { virtuals: true });

// export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);