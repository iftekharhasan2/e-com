// api/sub.js
import { MongoClient } from 'mongodb';

// 🔗 MongoDB Atlas connection string
// ⚠️ Move to Vercel Environment Variables in production
const MONGODB_URI = 'mongodb+srv://Yeamin:kNRgLTsUiw6qWU0x@cluster0.nzauztk.mongodb.net/yamin';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const client = new MongoClient(MONGODB_URI);

  try {
    const { name, phone, email, address, transactionId, total, items } = req.body;

    // Server-side validation
    const errors = [];
    if (!name?.trim()) errors.push('Name is required');
    if (!phone?.trim()) errors.push('Phone is required');
    if (!email?.trim()) errors.push('Email is required');
    if (!address?.trim()) errors.push('Address is required');
    if (!transactionId?.trim()) errors.push('Transaction ID is required');
    if (!total || isNaN(parseFloat(total))) errors.push('Valid total amount is required');
    if (!Array.isArray(items) || items.length === 0) errors.push('Cart items are required');

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db('Yamin');
    const collection = db.collection('orders');

    // Create order document
    const order = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      transactionId: transactionId.trim().toUpperCase(),
      total: parseFloat(total),
      items: items.map(item => ({
        id: item.id || null,
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
        subtotal: parseFloat(item.price) * parseInt(item.quantity)
      })), // store items as objects
      status: 'pending',
      paymentMethod: 'bKash',
      paymentOnDelivery: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert into MongoDB
    const result = await collection.insertOne(order);

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      transactionId: order.transactionId,
      orderId: result.insertedId.toString()
    });

  } catch (error) {
    console.error('🔥 Order submission error:', error);
    return res.status(500).json({
      error: 'Failed to process order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await client.close();
  }
}