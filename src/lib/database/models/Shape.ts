// import mongoose, { Document, Schema } from 'mongoose';

// export interface IShape extends Document {
//   _id: string;
//   shapeId: string; // Custom ID from shapes.json
//   name: string;
//   type: 'rect' | 'circle' | 'polygon';
//   data: any; // Shape-specific data
//   createdAt: Date;
//   updatedAt: Date;
// }

// const ShapeSchema = new Schema<IShape>(
//   {
//     shapeId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     name: {
//       type: String,
//       required: true,
//     },
//     type: {
//       type: String,
//       required: true,
//       enum: ['rect', 'circle', 'polygon'],
//     },
//     data: {
//       type: Schema.Types.Mixed,
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//     collection: 'shapes',
//   }
// );

// export default mongoose.models.Shape || mongoose.model<IShape>('Shape', ShapeSchema);