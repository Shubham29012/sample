import connectDB from './connection';
import Shape from './models/Shape';
import shapesData from '@/data/shapes.json';

export async function seedShapes() {
  await connectDB();
  
  try {
    // Clear existing shapes
    await Shape.deleteMany({});
    
    // Insert shapes from JSON
    const shapesToInsert = shapesData.map(shape => ({
      shapeId: shape.id,
      name: shape.name,
      type: shape.type,
      data: shape,
    }));
    
    await Shape.insertMany(shapesToInsert);
    console.log('✅ Shapes seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding shapes:', error);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedShapes().then(() => process.exit(0));
}